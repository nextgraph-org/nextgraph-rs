// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { describe, test, expect, beforeEach } from "vitest";
import { initNgSignals } from "./initNg.ts";
import { OrmConnection } from "./ormConnectionHandler.ts";
import type { Patch } from "./applyPatches.ts";

// Provide a minimal window mock for Node.js environment.
// (It is used for debugging purposes in ormConnectionHandler)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = (globalThis as any).window ?? {};

// Track all calls to graph_orm_update.
const graphOrmUpdateCalls: Array<{
    subscriptionId: number;
    patches: Patch[];
    sessionId: string;
}> = [];

// Store callbacks to simulate engine messages.
const connectionCallbacks = new Map<number, Function>();
let nextSubscriptionId = 1;

const mockNg = {
    orm_start_graph: async (
        graph_scope: string[],
        subject_scope: string[],
        shapeType: any,
        session_id: string | number,
        callback: Function
    ): Promise<() => void> => {
        const subscriptionId = nextSubscriptionId++;
        connectionCallbacks.set(subscriptionId, callback);

        // Simulate engine sending initial data (empty set).
        // This resolves the readyPromise in OrmConnection.
        setTimeout(() => {
            callback({
                V0: {
                    GraphOrmInitial: [{}, subscriptionId],
                },
            });
        }, 1);

        // Return the close function.
        return () => {
            connectionCallbacks.delete(subscriptionId);
        };
    },

    graph_orm_update: async (
        subscription_id: number,
        patches: Patch[],
        session_id: string
    ): Promise<void> => {
        graphOrmUpdateCalls.push({
            subscriptionId: subscription_id,
            patches: [...patches],
            sessionId: session_id,
        });
    },
};

const mockSession = {
    session_id: "test-session-id",
    protected_store_id: "protected-store",
    private_store_id: "private-store",
    public_store_id: "public-store",
};

// Initialize mocks once before tests.
initNgSignals(mockNg as any, mockSession);

describe("orm connection handler transactions", () => {
    beforeEach(() => {
        // Clear tracked calls between tests.
        graphOrmUpdateCalls.length = 0;
    });

    test("Modifications are recorded in order and ready for commit immediately", async () => {
        const connection = OrmConnection.getOrCreate(
            { schema: {}, shape: "test:Shape1" },
            { graphs: ["did:ng:test:graph1"] }
        );

        // Wait for connection to be ready.
        await connection.readyPromise;

        connection.beginTransaction();

        // Add first item.
        connection.signalObject.add({
            "@id": "did:ng:test:subject1",
            "@graph": "did:ng:test:graph1",
            name: "First",
        } as any);
        expect(connection.pendingPatches).toBeDefined();
        expect(connection.pendingPatches!.length).toBeGreaterThan(0);
        const firstPatchCount = connection.pendingPatches!.length;

        // Await so all microtasks run in-between.
        await Promise.resolve();

        // Add second item.
        connection.signalObject.add({
            "@id": "did:ng:test:subject2",
            "@graph": "did:ng:test:graph1",
            name: "Second",
        } as any);

        // New patches should be available
        expect(connection.pendingPatches?.length).toBeGreaterThan(
            firstPatchCount
        );

        // Patches should be collected immediately (synchronously).
        // DeepSignal generates multiple patches per add (for each property).

        await connection.commitTransaction();

        // Verify patches were sent to backend.
        expect(graphOrmUpdateCalls.length).toBe(1);
        expect(graphOrmUpdateCalls[0].patches.length).toBeGreaterThan(
            firstPatchCount
        );

        // Expect transaction to be reset.
        expect(connection.inTransaction).toBe(false);
        expect(connection.pendingPatches).toBeUndefined();

        connection.close();
    });

    test("Commit without begin throws error", async () => {
        const connection = OrmConnection.getOrCreate(
            { schema: {}, shape: "test:Shape3" },
            { graphs: ["did:ng:test:graph3"] }
        );

        await connection.readyPromise;

        await expect(connection.commitTransaction()).rejects.toThrow(
            "No transaction is open"
        );

        connection.close();
    });

    test("Multiple transactions work correctly in sequence", async () => {
        const connection = OrmConnection.getOrCreate(
            { schema: {}, shape: "test:Shape5" },
            { graphs: ["did:ng:test:graph5"] }
        );

        await connection.readyPromise;

        // First transaction.
        connection.beginTransaction();
        connection.signalObject.add({
            "@id": "did:ng:test:subject1",
            "@graph": "did:ng:test:graph5",
            value: 1,
        } as any);
        await connection.commitTransaction();

        // Second transaction.
        connection.beginTransaction();
        connection.signalObject.add({
            "@id": "did:ng:test:subject2",
            "@graph": "did:ng:test:graph5",
            value: 2,
        } as any);
        await connection.commitTransaction();

        // Two separate commits should result in two backend calls.
        expect(graphOrmUpdateCalls.length).toBe(2);
        // Each transaction should have captured some patches.
        expect(graphOrmUpdateCalls[0].patches.length).toBeGreaterThan(0);
        expect(graphOrmUpdateCalls[1].patches.length).toBeGreaterThan(0);

        // Now make changes without transaction.

        connection.signalObject.add({
            "@id": "did:ng:test:subject3",
            "@graph": "did:ng:test:graph5",
            value: 3,
        } as any);

        connection.signalObject.add({
            "@id": "did:ng:test:subject4",
            "@graph": "did:ng:test:graph5",
            value: 4,
        } as any);

        // The previous two are batched in the same microtask.
        // The await flushes that and will collect a new batch.
        await Promise.resolve();

        connection.signalObject.add({
            "@id": "did:ng:test:subject5",
            "@graph": "did:ng:test:graph5",
            value: 5,
        } as any);

        // Wait for async onSignalObjectUpdate calls to complete.
        await new Promise((resolve) => setTimeout(resolve, 0));

        // 2 from transactions + 2 from below.
        expect(graphOrmUpdateCalls.length).toBe(4);

        connection.close();
    });
});
