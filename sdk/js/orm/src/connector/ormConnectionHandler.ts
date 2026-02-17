// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { Scope } from "../types.ts";
import { applyPatchesToDeepSignal, Patch } from "./applyPatches.ts";

import { ngSession } from "./initNg.ts";

import {
    deepSignal,
    watch as watchDeepSignal,
    batch,
} from "@ng-org/alien-deepsignals";
import type {
    DeepSignalPropGenFn,
    DeepSignalSet,
    WatchPatchEvent,
} from "@ng-org/alien-deepsignals";
import type { ShapeType, BaseType } from "@ng-org/shex-orm";
import { deepPatchesToWasm } from "./utils.ts";

/**
 * Delay in ms to wait before closing subscription.\
 * Useful when a hook unsubscribes and resubscribes in a short time interval
 * so that no new subscriptions need to be set up.
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
export class OrmConnection<T extends BaseType> {
    /** Global store of all subscriptions. We use that for pooling. */
    private static idToEntry = new Map<string, OrmConnection<any>>();

    /** The shape type that is subscribed to. */
    readonly shapeType: ShapeType<T>;
    /** The {@link Scope} of the subscription. */
    readonly scope: Scope;
    /**
     * The signalObject containing all data matching the shape and scope
     * (once subscription is established).
     * The object is of type {@link DeepSignalSet} which
     * to the outside behaves like a regular set but has a couple of
     * additional features:
     * - Modifications are immediately propagated back to the database.
     * - Database changes are immediately reflected in the object.
     * - `.getBy(graphIri, subjectIri)` utility for quicker access to objects in set.
     * - `.first()` utility to get the first element added to the set.
     * - the iterator utilities, e.g. `.map()`, `.filter()`, ...
     * - Watch for object changes using {@link watchDeepSignal}.
     */
    readonly signalObject: DeepSignalSet<T>;
    private stopSignalListening: () => void;
    /** The subscription id kept as an identifier for communicating with the verifier. */
    private subscriptionId: number | undefined;
    /** The number of OrmConnections with the same shape and scope (for pooling). */
    private refCount: number;
    /** Identifier as a combination of shape type and scope. Prevents duplications. */
    private identifier: string;
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

    // FinalizationRegistry to clean up subscriptions when signal objects are GC'd.
    private static cleanupSignalRegistry =
        typeof FinalizationRegistry === "function"
            ? new FinalizationRegistry<string>((connectionId) => {
                  console.log("finalization called for", connectionId);
                  // Best-effort fallback; look up by id and clean
                  const entry = this.idToEntry.get(connectionId);
                  console.log("cleaning up connection", connectionId);
                  if (!entry) return;
                  entry.close();
              })
            : null;

    private constructor(shapeType: ShapeType<T>, scope: Scope) {
        // @ts-expect-error
        window.ormSignalConnections = OrmConnection.idToEntry;
        // @ts-expect-error
        window.OrmConnection = OrmConnection;

        this.shapeType = shapeType;
        this.scope = scope;
        this.refCount = 1;
        this.closeOrmConnection = () => {};
        this.suspendDeepWatcher = false;
        this.identifier = `${shapeType.shape}|${canonicalScope(scope)}`;
        this.signalObject = deepSignal<Set<T>>(new Set(), {
            propGenerator: this.signalObjectPropGenerator,
            // Don't set syntheticIdPropertyName - let propGenerator handle all ID logic
            readOnlyProps: ["@id", "@graph"],
        });

        // Schedule cleanup of the connection when the signal object is GC'd.
        OrmConnection.cleanupSignalRegistry?.register(
            this.signalObject,
            this.identifier,
            this.signalObject
        );

        // Add listener to deep signal object to report changes back to wasm land.
        const { stopListening } = watchDeepSignal(
            this.signalObject,
            this.onSignalObjectUpdate
        );
        this.stopSignalListening = stopListening;

        // Set promise to be resolved when data arrived from engine.
        this.readyPromise = new Promise<void>((resolve) => {
            this.resolveReady = resolve;
        });

        ngSession.then(async ({ ng, session }) => {
            try {
                this.closeOrmConnection = await ng.orm_start_graph(
                    scope.graphs ?? ["did:ng:i"],
                    scope.subjects ?? [],
                    shapeType,
                    session.session_id,
                    this.onBackendMessage
                );
            } catch (e) {
                console.error(e);
            }
        });
    }

    /**
     * Returns an OrmConnection which subscribes to the given
     * {@link ShapeType} and {@link Scope} in a 2-way binding.
     *
     * You **find the data** and objects matching the shape and scope
     * in the **`signalObject`** once {@link readyPromise} resolves. This is a {@link DeepSignalSet} which
     * to the outside behaves like a regular set but has a couple of
     * additional features:
     * - Modifications are propagated back to the database.
     *   Note that multiple immediate modifications in the same task,
     *   e.g. `obj[0] = "foo"; obj[1] = "bar"` are batched together
     *   and sent in a subsequent microtask.
     * - Database changes are immediately reflected in the object.
     * - `.getBy(graphIri, subjectIri)` utility for quicker access to objects in set.
     * - `.first()` utility to get the first element added to the set.
     * - the iterator utilities, e.g. `.map()`, `.filter()`, ...
     * - Watch for object changes using {@link watchDeepSignal}.
     *
     * You can use **transactions**, to prevent excessive calls to the database
     * with {@link beginTransaction} and {@link commitTransaction}.
     *
     * In many cases, you are advised to use a hook for your
     * favorite framework under `@ng-org/orm/react|vue|svelte`
     * instead of calling `getOrCreate` directly.
     *
     * Call `{@link close}, to close the subscription.
     *
     * Note: If another call to `getOrCreate` was previously made
     * and `close` was not called on it (or only shortly after),
     * it will return the same OrmConnection.
     *
     * @param shapeType The {@link ShapeType}
     * @param scope The {@link Scope}. If no scope is given, the whole store is considered.
     *
     * @example
     * ```typescript
     * // We assume you have created a graph document already, as below.
     * // const documentId = await ng.doc_create(
     * //     session_id,
     * //     "Graph",
     * //     "data:graph",
     * //     "store",
     * //     undefined
     * // );
     * const subscription = OrmConnection.getOrCreate(ExpenseShapeType, {graphs: [graphIri]});
     * // Wait for data.
     * await subscription.readyPromise;
     *
     * const expense = subscription.signalObject.first()
     * expense.name = "updated name";
     * expense.description = "updated description";
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
     * // If you create a new subscription with the same document within a couple of 100ms,
     * // The subscription hasn't been closed and the old one is returned so that the data
     * // is available instantly. This is especially useful in the context of frontend frameworks.
     * const subscription2 = OrmConnection.getOrCreate(ExpenseShapeType, {graphs: [graphIri]});
     *
     * subscription2.signalObject.add({
     *    "@graph": graphIri,
     *    "@id": "", // Leave empty to auto-assign one.
     *    name": "A new expense",
     *    description: "A new description"
     * });
     *
     * subscription2.close()
     */
    public static getOrCreate = <T extends BaseType>(
        shapeType: ShapeType<T>,
        scope: Scope
    ): OrmConnection<T> => {
        const scopeKey = canonicalScope(scope);

        // Unique identifier for a given shape type and scope.
        const identifier = `${shapeType.shape}|${scopeKey}`;

        // If we already have an object for this shape+scope,
        // return it and just increase the reference count.
        // Otherwise, create new one.
        const existingConnection = OrmConnection.idToEntry.get(identifier);
        if (existingConnection) {
            existingConnection.refCount += 1;
            return existingConnection;
        } else {
            const newConnection = new OrmConnection(shapeType, scope);
            OrmConnection.idToEntry.set(identifier, newConnection);
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
                OrmConnection.idToEntry.delete(this.identifier);

                OrmConnection.cleanupSignalRegistry?.unregister(
                    this.signalObject
                );
                this.closeOrmConnection();
            }
        }, WAIT_BEFORE_CLOSE);
    };

    /** Handle updates (patches) coming from signal object modifications. */
    private onSignalObjectUpdate = async ({ patches }: WatchPatchEvent<T>) => {
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

        ng.graph_orm_update(
            this.subscriptionId!,
            ormPatches,
            session.session_id
        );
    };

    /** Handle messages coming from the engine (initial data or patches). */
    private onBackendMessage = (message: any) => {
        const data = message?.V0;
        if (data?.GraphOrmInitial) {
            this.handleInitialResponse(data.GraphOrmInitial);
        } else if (data?.GraphOrmUpdate) {
            this.onBackendUpdate(data.GraphOrmUpdate);
        } else {
            console.warn("Received unknown ORM message from engine", message);
        }
    };

    private handleInitialResponse = ([initialData, subscriptionId]: [
        any,
        number,
    ]) => {
        this.subscriptionId = subscriptionId;
        // Assign initial data to empty signal object without triggering watcher at first.
        this.suspendDeepWatcher = true;
        batch(() => {
            // Note: Instead, we await for the connection to be initialized and send patches after. So no need to remove.
            // // Do this in case the there was any (incorrect) data added before initialization.
            // this.signalObject.clear();

            // Convert arrays to sets and apply to signalObject (we only have sets but can only transport arrays).
            for (const newItem of parseOrmInitialObject(initialData)) {
                this.signalObject.add(newItem);
            }
        });

        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
            // Resolve readiness after initial data is committed and watcher armed.
            this.resolveReady();
        });
    };

    /** Handle incoming patches from the engine */
    private onBackendUpdate = (patches: Patch[]) => {
        this.suspendDeepWatcher = true;
        applyPatchesToDeepSignal(this.signalObject, patches, "set");
        // Use queueMicrotask to ensure watcher is re-enabled _after_ batch completes
        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
        });
    };

    /** Function to create random subject IRIs for newly created nested objects. */
    private signalObjectPropGenerator: DeepSignalPropGenFn = ({
        path,
        object,
    }) => {
        let graphIri: string | undefined = undefined;
        let subjectIri: string | undefined = undefined;

        // If no @graph is set, add the parent's graph IRI. If there is no parent, throw.
        if (!object["@graph"] || object["@graph"] === "") {
            if (path.length > 1) {
                // The first part of the path is the <graphIri>|<subjectIri> composition.
                graphIri = (path[0] as string).split("|")[0];
            } else {
                throw new Error(
                    "When adding new root orm objects, you must specify the @graph"
                );
            }
        } else {
            graphIri = object["@graph"];
        }

        if (object["@id"] && object["@id"] !== "") {
            subjectIri = object["@id"];
        } else {
            // Generate 33 random bytes using Web Crypto API
            const b = new Uint8Array(33);
            crypto.getRandomValues(b);

            // Convert to base64url
            const base64url = (bytes: Uint8Array) =>
                btoa(String.fromCharCode(...bytes))
                    .replace(/\+/g, "-")
                    .replace(/\//g, "_")
                    .replace(/=+$/, "");
            const randomString = base64url(b);

            // We use the root subject's graph as the basis.
            // TODO: We could use the closest parent's graph instead.
            subjectIri =
                ((path[0] ?? graphIri) as string).substring(0, 9 + 44) +
                ":q:" +
                randomString;
        }

        return {
            extraProps: { "@id": subjectIri, "@graph": graphIri },
            syntheticId: graphIri + "|" + subjectIri,
        };
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

        // Use a listener that immediately triggers on object modifications.
        // We don't need the deep-signal's batching (through microtasks) here.
        this.stopSignalListening();
        const { stopListening } = watchDeepSignal(
            this.signalObject,
            this.onSignalObjectUpdate,
            { triggerInstantly: true }
        );
        this.stopSignalListening = stopListening;
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
            // Nothing to send to the engine.
        } else {
            // Send patches to engine.
            await ng.graph_orm_update(
                this.subscriptionId!,
                this.pendingPatches!,
                session.session_id
            );
        }

        this.pendingPatches = undefined;

        // Go back to the regular object modification listening where we want batching
        // scheduled in a microtask only triggered after the main task.
        // This way we prevent excessive calls to the engine.
        this.stopSignalListening();
        const { stopListening } = watchDeepSignal(
            this.signalObject,
            this.onSignalObjectUpdate
        );
        this.stopSignalListening = stopListening;
    };
}

const parseOrmInitialObject = (obj: any): any => {
    // Regular arrays become sets.
    if (Array.isArray(obj)) {
        return new Set(obj.map(parseOrmInitialObject));
    } else if (obj && typeof obj === "object") {
        if ("@id" in obj) {
            // Regular object.
            for (const key of Object.keys(obj)) {
                obj[key] = parseOrmInitialObject(obj[key]);
            }
        } else {
            // Object does not have @id, that means it's a set of objects.
            return new Set(Object.values(obj).map(parseOrmInitialObject));
        }
    }
    return obj;
};

/**
 * Creates a string out of the scope in the format
 * `graphIri1,graphIri2|subjectIri1,subjectIri2`
 */
function canonicalScope(scope: Scope): string {
    if (!scope) return "";
    return `${(scope.graphs || []).slice().sort().join(",")}|${(scope.subjects || []).slice().sort().join(",")}`;
}
