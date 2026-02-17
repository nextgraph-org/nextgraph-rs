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

/**
 * Class for managing RDF-based ORM subscriptions with the engine.
 *
 * You have two options on how to interact with the ORM:
 * - Use a hook for your favorite framework under `@ng-org/orm/react|vue|svelte`
 * - Call {@link OrmConnection.getOrCreate} to create a subscription manually
 *
 * For more information about RDF-based ORM subscriptions,
 * see the README and follow the tutorial.
 */
export class DiscreteOrmConnection {
    /** Global store of all subscriptions. We use that for pooling. */
    private static idToEntry = new Map<string, DiscreteOrmConnection>();

    /** The document id (IRI) of the subscribed document. */
    readonly documentId: string;
    private _signalObject:
        | DeepSignal<DiscreteArray | DiscreteObject>
        | undefined;
    private stopSignalListening: undefined | (() => void);
    /** The subscription id kept as an identifier for communicating with the verifier. */
    private subscriptionId: number | undefined;
    /** The number of OrmConnections with the same shape and scope (for pooling). */
    private refCount: number;
    /** When true, modifications from the signalObject are not processed. */
    suspendDeepWatcher: boolean;
    /** True, if a transaction is running. */
    inTransaction: boolean = false;
    /** Aggregation of patches to be sent when in transaction. */
    pendingPatches: Patch[] | undefined;
    /** **Await to ensure that the subscription is established and the data arrived.** */
    readyPromise: Promise<void>;
    private closeOrmConnection: () => void;
    /** Function to call once initial data has been applied. */
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
     * Returns an OrmConnection which subscribes to the given
     * document in a 2-way binding.
     *
     * You **find the document data** in the **`signalObject`**
     * once {@link readyPromise} resolves.
     * This is a {@link DeepSignal} object or array, depending on
     * your CRDT document (e.g. YArray vs YMap). The signalObject
     * behaves like a regular set to the outside but has a couple
     * of additional features:
     * - Modifications are propagated back to the document.
     *   Note that multiple immediate modifications in the same task,
     *   e.g. `obj[0] = "foo"; obj[1] = "bar"` are batched together
     *   and sent in a subsequent microtask.
     * - External document changes are immediately reflected in the object.
     * - Watch for object changes using {@link watchDeepSignal}.
     *
     * You can use **transactions**, to prevent excessive calls to the engine
     * with {@link beginTransaction} and {@link commitTransaction}.
     *
     * In many cases, you are advised to use a hook for your
     * favorite framework under `@ng-org/orm/react|vue|svelte`
     * instead of calling `getOrCreate` directly.
     *
     * Call `{@link close}, to close the subscription.
     *
     * Note: If another call to `getOrCreate` was previously made
     * and {@link close} was not called on it (or only shortly after),
     * it will return the same OrmConnection.
     *
     * @param documentId The document ID (IRI) of the CRDT
     *
     * @example
     * ```typescript
     * // We assume you have created a CRDT document already, as below.
     * // const documentId = await ng.doc_create(
     * //     session_id,
     * //     crdt, // "Automerge" | "YMap" | "YArray". YArray is for root arrays, the other two have objects at root.
     * //     crdt === "Automerge" ? "data:json" : crdt === "YMap ? "data:map" : "data:array",
     * //     "store",
     * //     undefined
     * // );
     * const subscription = DiscreteOrmConnection.getOrCreate(documentId);
     * // Wait for data.
     * await subscription.readyPromise;
     *
     * const document = subscription.signalObject;
     * if (!document.expenses) {
     *     document.expenses = [];
     * }
     * document.expenses.push({
     *     name: "New Expense name",
     *     description: "Expense description"
     * });
     *
     * // Await promise to run the below code in a new task.
     * // That will push the changes to the database.
     * await Promise.resolve();
     *
     * // Here, the expense modifications have been have been committed
     * // (unless you had previously called subscription.beginTransaction()).
     * // The data is available in subscriptions running on a different device too.
     *
     * subscription.close();
     *
     * // If you create a new subscription with the same document within a couple of 100ms,
     * // The subscription hasn't been closed and the old one is returned so that the data
     * // is available instantly. This is especially useful in the context of frontend frameworks.
     * const subscription2 = DiscreteOrmConnection.getOrCreate(documentId);
     *
     * subscription2.signalObject.expenses.push({
     *     name: "Second expense",
     *     description: "Second description"
     * });
     *
     * subscription2.close();
     * ```
     */
    public static getOrCreate = <T extends BaseType>(
        documentId: string
    ): DiscreteOrmConnection => {
        // If we already have a connection open,
        // return that signal object and just increase the reference count.
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

    /**
     * Stop the subscription.
     *
     * **If there is more than one subscription with the same shape type and scope
     * the orm subscription will persist.**
     *
     * Additionally, the closing of the subscription is delayed by a couple hundred milliseconds
     * so that when frontend frameworks unmount and soon mound a component again with the same
     * shape type and scope, no new orm subscription has be set up with the engine.
     */

    public close = () => {
        setTimeout(() => {
            if (this.refCount > 0) this.refCount--;
            if (this.refCount === 0) {
                DiscreteOrmConnection.idToEntry.delete(this.documentId);

                this.closeOrmConnection();
            }
        }, WAIT_BEFORE_CLOSE);
    };

    /** Handle updates (patches) coming from signal object modifications. */
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

    /** Handle messages coming from the engine (initial data or patches). */
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

    /** Handle incoming patches from the engine */
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

    /**
     * Begins a transaction that batches changes to be committed to the database.
     * This is useful for performance reasons.
     *
     * Note that this does not disable reactivity of the `signalObject`.
     * Modifications keep being rendered.
     */
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

    /**
     * Commits a transactions sending all modifications made during the transaction
     * (started with `beginTransaction`) to the database.
     */
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
