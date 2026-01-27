// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { DiscreteArray, DiscreteObject } from "../../types.ts";
import { applyPatchesToDeepSignal, Patch } from "../applyPatches.ts";

import { ngSession } from "../initNg.ts";

import {
    deepSignal,
    watch as watchDeepSignal,
    batch,
} from "@ng-org/alien-deepsignals";
import type {
    DeepPatch,
    DeepSignal,
    DeepSignalObject,
    WatchPatchEvent,
} from "@ng-org/alien-deepsignals";
import type { BaseType } from "@ng-org/shex-orm";

/**
 * Delay in ms to wait before closing connection.\
 * Useful when a hook unsubscribes and resubscribes in a short time interval
 * so that no new connections need to be set up.
 */
const WAIT_BEFORE_CLOSE = 500;

export class DiscreteOrmConnection {
    private static idToEntry = new Map<string, DiscreteOrmConnection>();

    readonly documentId: string;
    private _signalObject:
        | DeepSignal<DiscreteArray | DiscreteObject>
        | undefined;
    private stopSignalListening: undefined | (() => void);
    private subscriptionId: number | undefined;
    private refCount: number;
    suspendDeepWatcher: boolean;
    inTransaction: boolean = false;
    /** Aggregation of patches to be sent when in transaction. */
    pendingPatches: Patch[] | undefined;
    /** Resolves once the data arrives */
    readyPromise: Promise<void>;
    private closeOrmConnection: () => void;
    /** Called to resolve the readyPromise. */
    private resolveReady!: () => void;

    private constructor(documentId: string) {
        // @ts-expect-error
        window.ormDiscreteSignalConnections = DiscreteOrmConnection.idToEntry;
        // @ts-expect-error
        window.OrmDiscreteConnection = DiscreteOrmConnection;
        // @ts-expect-error
        window.OrmDiscreteIncomingPatches = [];

        this.documentId = documentId;
        this.refCount = 1;
        this.closeOrmConnection = () => {};
        this.suspendDeepWatcher = false;

        // Initialize per-entry readiness promise that resolves in setUpConnection
        this.readyPromise = new Promise<void>((resolve) => {
            this.resolveReady = resolve;
        });

        ngSession.then(async ({ ng, session }) => {
            try {
                this.closeOrmConnection = await ng.orm_start_discrete(
                    documentId,
                    session.session_id,
                    this.onBackendMessage
                );
            } catch (e) {
                console.error(e);
            }
        });
    }

    public get signalObject() {
        return this._signalObject;
    }

    /**
     * Get or create a connection which contains the ORM and lifecycle methods.
     * @param shapeType
     * @param scope
     * @param ng
     * @returns
     */
    public static getOrCreate = <T extends BaseType>(
        documentId: string
    ): DiscreteOrmConnection => {
        // If we already have a connection open,
        // return that signal object it and just increase the reference count.
        // Otherwise, open a new one.
        const existingConnection =
            DiscreteOrmConnection.idToEntry.get(documentId);
        if (existingConnection) {
            existingConnection.refCount += 1;
            return existingConnection;
        } else {
            const newConnection = new DiscreteOrmConnection(documentId);
            DiscreteOrmConnection.idToEntry.set(documentId, newConnection);
            return newConnection;
        }
    };

    public close = () => {
        setTimeout(() => {
            if (this.refCount > 0) this.refCount--;
            if (this.refCount === 0) {
                DiscreteOrmConnection.idToEntry.delete(this.documentId);

                this.closeOrmConnection();
            }
        }, WAIT_BEFORE_CLOSE);
    };

    private onSignalObjectUpdate = async ({
        patches,
    }: WatchPatchEvent<DiscreteArray | DiscreteObject>) => {
        if (this.suspendDeepWatcher || !patches.length) return;

        const ormPatches = deepPatchesToWasm(patches);

        // If in transaction, collect patches immediately (no await before).
        if (this.inTransaction) {
            this.pendingPatches?.push(...ormPatches);
            return;
        }

        // Wait for session and subscription to be initialized.
        const { ng, session } = await ngSession;
        await this.readyPromise;

        ng.discrete_orm_update(
            this.subscriptionId!,
            ormPatches,
            session.session_id
        );
    };

    private onBackendMessage = (message: any) => {
        const data = message?.V0;
        if (data?.DiscreteOrmInitial) {
            this.handleInitialResponse(data.DiscreteOrmInitial);
        } else if (data?.DiscreteOrmUpdate) {
            this.onBackendUpdate(data.DiscreteOrmUpdate);
        } else {
            console.warn("Received unknown ORM message from backend", message);
        }
    };

    private handleInitialResponse = ([initialData, subscriptionId]: [
        any,
        number,
    ]) => {
        this.subscriptionId = subscriptionId;
        const signalObject = deepSignal(initialData, {
            syntheticIdPropertyName: undefined,
        });
        this._signalObject = signalObject;
        const { stopListening } = watchDeepSignal(
            this._signalObject!,
            this.onSignalObjectUpdate
        );
        this.stopSignalListening = stopListening;

        // Resolve readiness after initial data is committed and watcher armed.
        this.resolveReady();
    };

    private onBackendUpdate = (patches: Patch[]) => {
        // @ts-expect-error
        window.OrmDiscreteIncomingPatches.push(patches);

        this.suspendDeepWatcher = true;
        applyPatchesToDeepSignal(this._signalObject!, patches, "discrete");
        // Use queueMicrotask to ensure watcher is re-enabled _after_ batch completes
        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
        });
    };

    public beginTransaction = () => {
        this.inTransaction = true;
        this.pendingPatches = [];

        this.readyPromise.then(() => {
            // Use a listener that immediately triggers on object modifications.
            // We don't need the deep-signal's batching (through microtasks) here.
            this.stopSignalListening?.();
            const { stopListening } = watchDeepSignal(
                this.signalObject!,
                this.onSignalObjectUpdate,
                { triggerInstantly: true }
            );
            this.stopSignalListening = stopListening;
        });
    };

    public commitTransaction = async () => {
        if (!this.inTransaction) {
            throw new Error(
                "No transaction is open. Call `beginTransaction` first."
            );
        }

        const { ng, session } = await ngSession;
        await this.readyPromise;

        this.inTransaction = false;

        if (this.pendingPatches?.length == 0) {
            // Nothing to send to the backend.
        } else {
            ng.discrete_orm_update(
                this.subscriptionId!,
                this.pendingPatches!,
                session.session_id
            );
        }

        this.pendingPatches = undefined;

        // Go back to the regular object modification listening where we want batching
        // scheduled in a microtask only triggered after the main task.
        // This way we prevent excessive calls to the backend.
        this.stopSignalListening!();
        const { stopListening } = watchDeepSignal(
            this.signalObject!,
            this.onSignalObjectUpdate
        );
        this.stopSignalListening = stopListening;
    };
}

/**
 * Converts DeepSignal patches to ORM Wasm-compatible patches
 * @param patches DeepSignal patches
 * @returns Patches with stringified path
 */

export function deepPatchesToWasm(patches: DeepPatch[]): Patch[] {
    return patches.flatMap((patch) => {
        if (patch.op === "add" && patch.type === "set" && !patch.value?.length)
            return [];
        const path = "/" + patch.path.join("/");
        return { ...patch, path };
    }) as Patch[];
}
