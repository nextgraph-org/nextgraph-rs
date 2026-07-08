// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { NormalizedScope, normalizeScope, type Scope } from "../types.ts";
import { applyPatchesToDeepSignal, Patch } from "./applyPatches.ts";

import { ngSession } from "./initNg.ts";

import {
    deepSignal,
    watch as watchDeepSignal,
    batch,
    isDeepSignal,
    RAW_KEY,
} from "@ng-org/alien-deepsignals";
import type {
    OnObjectAttachedFn,
    DeepSignalSet,
    WatchPatchEvent,
    effect,
    computed,
    DeepSignal,
    DeepPatch,
    DeepSignalOptions,
} from "@ng-org/alien-deepsignals";
import type { ShapeType, BaseType } from "@ng-org/shex-orm";
import { ObjectType, OrmConfig } from "../utilTypes.ts";
import { decodePathSegment, escapePathSegment } from "./utils.ts";

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
 * - Call {@link OrmSubscription.getOrCreate} to create a subscription manually
 *
 * For more information about RDF-based ORM subscriptions,
 * see the README and follow the tutorial.
 */
export class OrmSubscription<
    ST extends ShapeType<any>,
    OPTIONS extends OrmConfig<ST>,
    T extends BaseType = ST extends ShapeType<infer T_> ? T_ : never,
    OT extends ObjectType<OPTIONS, ST, T> = ObjectType<OPTIONS, ST, T>,
> {
    /** Global store of all subscriptions. We use that for pooling. */
    private static idToEntry = new Map<
        string,
        OrmSubscription<any, any, any>
    >();

    /** The shape type that is subscribed to. */
    readonly shapeType: ShapeType<T>;
    /** The {@link Scope} of the subscription. */
    readonly scope: Scope;
    /**
     * - `unordered`: /** The root object is a set.
     * - `orderedPaginatedCumulative`: `orderBy` and `pageSize` is set but `maxActivePages` not -> `signalObject` is an object of pages.
     * - `orderedPaginatedLimited`: `orderBy`, `pageSize`, and `maxActivePages` are set -> `signalObject` is an object of pages.
     *    Pages will be removed from `signalObject` when more pages are loaded than `maxActivePages` allows (which happens when calling `nextPage()` or `previousPage()`).
     * - `orderedUnpaginated`: `orderBy` is set but `pageSize` and `maxActivePage` not -> `signalObject` is an array.
     */
    readonly mode:
        | "unordered"
        | "orderedPaginatedCumulative"
        | "orderedPaginatedLimited"
        | "orderedUnpaginated";
    /**
     * The signalObject containing all data matching the shape and scope
     * (once subscription is established).
     * Depending on the options, the object is a set, an array, or an object of pages.
     *
     * Additionally, this object is a reactive {@link DeepSignal} object.
     * To the outside behaves like a regular object but has a couple of
     * additional features:
     * - Modifications are immediately propagated back to the database.
     * - Database changes are immediately reflected in the object.
     * - `.getBy(graphIri, subjectIri)` utility for quicker access to objects in sets.
     * - `.first()` utility to get the first element added to the set.
     * - the iterator utilities, e.g. `.map()`, `.filter()`, ...
     * - Watch for object changes using {@link watchDeepSignal}.
     * - Use can use them in {@link effect} and {@link computed}.
     */
    readonly signalObject: DeepSignal<OT>;
    /**
     * Map of all tracked (signal) objects. Each of them contains a `@graph`, `@id`, and `@shape` prop.
     * Nesting by reference to other tracked objects.
     * The key is a composite of <graph>|<subject>|<shape>.
     */
    private trackedObjects: Map<
        string,
        {
            obj: DeepSignal<BaseType>;
            stopListening: () => void;
            refCount: number;
        }
    > = new Map();
    /** Listeners that get notified when root objects are added, updated, or removed. */
    private changeListeners: Set<OrmChangeListener<T>> = new Set();
    private stopSignalListening: () => void;
    /** The subscription ID kept as an identifier for communicating with the verifier. */
    private subscriptionId: number | undefined;
    /** The number of OrmSubscriptions with the same shape and scope (for pooling). */
    private refCount: number;
    /** Identifier as a combination of shape type and scope. Prevents duplications. */
    private identifier: string;
    /** When true, modifications of the signalObject are not propagated to backend. */
    private suspendDeepWatcher: boolean = false;
    /** True, if a transaction is running. */
    private inTransaction_: boolean = false;
    /** Aggregation of patches to be sent when in transaction. @ignore */
    private pendingPatches: Patch[] = [];
    /** **Await to ensure that the subscription is established and the data arrived.** */
    private readyPromise_: Promise<void>;
    private closeOrmSubscription: () => void;
    /** Function to call once initial data has been applied. */
    private resolveReady!: () => void;
    /**
     * Set to true when patches are created and collected to be sent to the backend in
     * the next microtask. Prevents scheduling more than one microtask.
     */
    private isPatchMicrotaskScheduled: boolean = false;
    /** Configuration for signal object. */
    private signalSettings;

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

    private constructor(
        shapeType: ST,
        options: NormalizedOrmOptions<ST>,
        identifier: string
    ) {
        // @ts-expect-error
        window.ormSignalConnections = OrmSubscription.idToEntry;
        // @ts-expect-error
        window.OrmSubscription = OrmSubscription;

        this.shapeType = shapeType;
        this.scope = options;
        this.refCount = 1;
        this.closeOrmSubscription = () => {};
        this.identifier = identifier;

        if (options.orderBy === undefined) {
            this.mode = "unordered";
        } else if (options.pageSize === undefined) {
            this.mode = "orderedUnpaginated";
        } else if (options.maxActivePages === undefined) {
            this.mode = "orderedPaginatedCumulative";
        } else {
            this.mode = "orderedPaginatedLimited";
        }

        // Base signalObject depends on ordering and pagination settings.
        let baseObject =
            this.mode === "unordered"
                ? new Set()
                : this.mode === "orderedUnpaginated"
                  ? []
                  : {}; // With pages (and dynamic page indices).

        this.signalSettings = {
            onObjectAttached: this.attachSignalObjectHandler,

            readOnlyProps: ["@id", "@graph", "@shape"],
        } as DeepSignalOptions;
        this.signalObject = deepSignal(baseObject as any, this.signalSettings);

        // Schedule cleanup of the connection when the signal object is GC'd.
        OrmSubscription.cleanupSignalRegistry?.register(
            this.signalObject,
            this.identifier,
            this.signalObject
        );

        // Add listener to deep signal object to report changes back to wasm land.
        const { stopListening } = watchDeepSignal(
            this.signalObject,
            this.onSignalObjectUpdate,
            { triggerInstantly: true }
        );
        this.stopSignalListening = stopListening;

        // Set promise to be resolved when data arrived from engine.
        this.readyPromise_ = new Promise<void>((resolve) => {
            this.resolveReady = resolve;
        });

        ngSession.then(async ({ ng, session }) => {
            try {
                this.closeOrmSubscription = await ng.orm_start_graph(
                    options.graphs,
                    options.subjects,
                    shapeType,
                    session.session_id,
                    options,
                    this.onBackendMessage
                );
            } catch (e) {
                console.error(e);
            }
        });
    }

    /**
     * Returns an OrmSubscription which subscribes to the given
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
     * - The iterator utilities, e.g. `.map()`, `.filter()`, ...
     * - Use the object with alien-deepsignal functions like
     *   {@link effect}, {@link computed}, or {@link watchDeepSignal}.
     *
     *
     * You can use **transactions**, to prevent excessive calls to the database
     * with {@link beginTransaction} and {@link commitTransaction}.
     *
     * In many cases, you are advised to use a hook for your
     * favorite framework under `@ng-org/orm/react|vue|svelte`
     * instead of calling `getOrCreate` directly.
     *
     * Call {@link close}, to close the subscription.
     *
     * Note: If another call to `getOrCreate` was previously made
     * and `close` was not called on it (or only shortly after),
     * it will return the same OrmSubscription.
     *
     * @param shapeType The {@link ShapeType}
     * @param options The {@link OrmConfig}.
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
     * const subscription = OrmSubscription.getOrCreate(ExpenseShapeType, {graphs: [graphIri]});
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
     * const subscription2 = OrmSubscription.getOrCreate(ExpenseShapeType, {graphs: [graphIri]});
     *
     * subscription2.signalObject.add({
     *    "@graph": graphIri,
     *    "@id": "", // Leave empty to auto-assign one.
     *    name": "A new expense",
     *    description: "A new description"
     * });
     *
     * subscription2.close()
     * ```
     */
    public static getOrCreate = <
        ST extends ShapeType<any>,
        const OP extends OrmConfig<ST>,
        T extends BaseType = Exclude<ST["__type__"], undefined>,
    >(
        shapeType: ST,
        options: OP
    ): OrmSubscriptionFor<ST, OP, T> => {
        const { graphs, subjects, maxActivePages, orderBy, pageSize } = options;
        const normalizedScope = normalizeScope({ graphs, subjects });
        const scopeKey = canonicalScope(normalizedScope);
        const optionsKey = JSON.stringify({
            maxActivePages,
            orderBy,
            pageSize,
        });

        // Unique identifier for a given shape type, scope, and options.
        const identifier = `${shapeType.shape}|${scopeKey}|${optionsKey}`;

        // If we already have an object for this options,
        // return it and just increase the reference count.
        // Otherwise, create new one.
        const existingConnection = OrmSubscription.idToEntry.get(identifier);
        if (existingConnection) {
            existingConnection.refCount += 1;
            return existingConnection as any;
        } else {
            const newConnection = new OrmSubscription(
                shapeType,
                {
                    ...normalizedScope,
                    maxActivePages,
                    orderBy,
                    pageSize,
                },
                identifier
            );
            OrmSubscription.idToEntry.set(identifier, newConnection as any);
            return newConnection as any;
        }
    };

    /** True, if a transaction is running. */
    get inTransaction() {
        return this.inTransaction_;
    }
    /** **Await to ensure that the subscription is established and the data arrived.** */
    get readyPromise() {
        return this.readyPromise_;
    }

    /**
     * Stop the subscription.
     *
     * **If there is more than one subscription with the same shape type and scope
     * the orm subscription will persist.**
     *
     * Additionally, the closing of the subscription is delayed by a couple hundred milliseconds
     * so that when frontend frameworks unmount and soon mount a component again with the same
     * shape type and scope,  we reuse the same orm subscription.
     */
    public close = () => {
        setTimeout(() => {
            if (this.refCount > 0) this.refCount--;
            if (this.refCount === 0) {
                OrmSubscription.idToEntry.delete(this.identifier);

                OrmSubscription.cleanupSignalRegistry?.unregister(
                    this.signalObject
                );

                for (const [_key, objMeta] of this.trackedObjects) {
                    objMeta.stopListening();
                }
                this.closeOrmSubscription();
            }
        }, WAIT_BEFORE_CLOSE);
    };

    public addChangeListener(listener: OrmChangeListener<T>) {
        this.changeListeners.add(listener);
    }
    public removeChangeListener(listener: OrmChangeListener<T>) {
        this.changeListeners.delete(listener);
    }

    /** Handle updates (patches) coming from signal object modifications. */
    private onSignalObjectUpdate = async ({
        patches,
    }: WatchPatchEvent<any>) => {
        if (this.suspendDeepWatcher || !patches.length) return;
        if (this.mode !== "unordered")
            throw new Error(
                "Modifications in pagination and ordering not implemented yet"
            );

        // Unregister all deleted objects.
        for (const patch of patches) {
            if (patch.op === "remove" && typeof patch.value === "object") {
                const key = keyFromObject(patch.value);
                this.unregisterTrackedObject(key);
            }
        }

        // Send patches to engine.
        this.queuePatches({ patches: deepPatchesToWasm(patches) });

        // Delete calls unregisterTrackedObject
        // TODOs
        // - [ ] handle move
        // - [ ] handle delete
        // - [ ] handle add
        // - [ ] on adds and deletes: update ref count for children.

        // - [ ] how to deal with react's replace hierarchy; tell child tormos to do the same as root config
        // - [ ] option in deep signal setting: parents keep track of their replace children and handle that accordingly.
        // - [ ] error when object with wrong shape is attached
        //    - [ ] different modes:
        //          - non-signal object with g,s,sh, nothing more is attached -> sends link, expects object back
        //          - existing signal object with data and correct g,s,sh is attached -> sends link, expects nothing OR: sends del + everything
        //          - object with no sh is attached but with data
        //              - option1: frontend knows schema and adds shape itself <- it would need to find out which shape matches <- duplicate logic but immediate error
        //              - **option2**: backend sends @shape patch back with move from tmp shape to actual shape

        // - [x] patches to attach signal objects have a value that is the signal object itself
        //    - [x] the orm subscription handles the translation of those patches
        // - [x] the orm subscription intercepts the root add patches from the backend and adds them to the set of tormos

        // pagination
    };
    private tmpShapeIdCount = 0;
    /** Gets a tracked orm object from @see trackedObjects and increases its `refCount`.*/
    private getTrackedObject = (object: BaseType | DeepSignal<BaseType>) => {
        const key = keyFromObject(object);

        // If it's already registered, return the existing one and increase the ref count.
        if (this.trackedObjects.has(key)) {
            const obj = this.trackedObjects.get(key)!;
            obj.refCount += 1;
            return obj;
        }

        return undefined;
    };
    /**
     * Registers a new object in @see trackedObjects and sets up watcher.
     * Only `@graph`, `@id`, `@shape` are set, the rest is added by @see initializeNewObject.
     */
    private registerTrackedObject = (object: BaseType) => {
        if (!object["@shape"]) {
            object["@shape"] = `tmp:shape:${this.tmpShapeIdCount++}`;
        }
        const key = keyFromObject(object);

        const signalObj = deepSignal(
            {
                "@graph": object["@graph"],
                "@id": object["@id"],
                "@shape": object["@shape"],
            } as BaseType,
            this.signalSettings
        );

        const { stopListening } = watchDeepSignal(
            signalObj,
            this.onSignalObjectUpdate
        );

        const trackedObject = {
            obj: signalObj,
            stopListening,
            refCount: 1,
        };
        this.trackedObjects.set(key, trackedObject);

        this.initializeNewObject(trackedObject.obj);

        return trackedObject;
    };
    private unregisterTrackedObject = (key: string) => {
        const removedObj = this.trackedObjects.get(key);
        if (!removedObj) return;
        removedObj.refCount -= 1;
        if (removedObj.refCount === 0) {
            removedObj.stopListening();
            this.trackedObjects.delete(key);
        }
    };

    /** Add patches to @see pendingPatches. Schedules a microtask to send them to the backend batched, if not in transaction. */
    private queuePatches({ patches }: { patches: Patch[] }) {
        this.pendingPatches.push(...patches);

        if (!this.inTransaction_ && !this.isPatchMicrotaskScheduled) {
            queueMicrotask(async () => {
                this.isPatchMicrotaskScheduled = false;

                if (this.pendingPatches.length > 0 && !this.inTransaction_) {
                    const { ng, session } = await ngSession;
                    ng.graph_orm_update(
                        this.subscriptionId!,
                        this.pendingPatches,
                        session.session_id
                    );
                    this.pendingPatches = [];
                }
            });
        }
    }

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
            // Convert arrays to sets and apply to signalObject (we only have sets but can only transport arrays).
            if (this.mode === "unordered") {
                for (const newItem of this.initializeNewObject(initialData)) {
                    (this.signalObject as Set<T>).add(newItem);
                }
            } else if (this.mode === "orderedUnpaginated") {
                for (const newItem of initialData) {
                    (this.signalObject as T[]).push(
                        this.initializeNewObject(newItem)
                    );
                }
            } else {
                // Set the first page.
                (this.signalObject as { "0": any })["0"] = {
                    items: (initialData[0].items as any[]).map((item) =>
                        this.initializeNewObject(item)
                    ),
                };
            }
        });

        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
            // Resolve readiness after initial data is committed and watcher armed.
            this.resolveReady();
        });
    };

    /** Registers raw objects in `this.trackedObjects`; resolves references to other tracked objects. Translates arrays object sets to sets. */
    private initializeNewObject = (obj: any): any => {
        if (obj === null) {
            return null;
        } else if (Array.isArray(obj)) {
            // Regular arrays become sets.
            return new Set(obj.map(this.initializeNewObject));
        } else if (typeof obj === "object") {
            if ("@id" in obj) {
                // Regular tracked object.

                let trackedObject = this.getTrackedObject(obj);

                if (!trackedObject) {
                    // Register object: will register obj and call `initializeNewObject` again.
                    trackedObject = this.registerTrackedObject(obj);
                } else {
                    // If the object exits, it might still be that we only registered a reference so far which did not contain properties.
                    // We add them here.
                    for (const key of Object.keys(obj)) {
                        if (key in ["@graph", "@id", "@shape"]) continue;

                        trackedObject.obj[key] = this.initializeNewObject(
                            obj[key]
                        );
                    }
                }

                return trackedObject!.obj;
            } else {
                // Object does not have @id, that means it's a set of objects.
                return new Set(
                    Object.values(obj).map(this.initializeNewObject)
                );
            }
        }
        // Literal.
        return obj;
    };

    /** Handle incoming patches from the engine */
    private onBackendUpdate = (patches: Patch[]) => {
        this.suspendDeepWatcher = true;

        const newObjects = patches.flatMap((p) => {
            if (
                p.path !== "/" ||
                p.valType !== "set" ||
                typeof p.value !== "object"
            )
                return [];

            const tracked = this.registerTrackedObject(p.value as any);

            return [tracked.obj];
        });
        const newRootObjects = newObjects.filter(
            (obj) => obj["@shape"] == this.shapeType.shape
        );

        const removedRoots = patches.flatMap((p) => {
            if (p.op !== "remove") return [];
            const matched = p.path.match(/^\/([^|]*|[^|]*|[^|]*)$/);
            if (!matched) return [];
            const [_, key] = matched;

            // Decrease refCount and remove from tracked objects if refCount is 0.
            const removedObj = this.trackedObjects.get(key)!;
            this.unregisterTrackedObject(key);

            if (removedObj.obj["@shape"] === this.shapeType.shape) {
                // TODO
                this.signalObject.delete(removedObj.obj);
            }

            return removedObj.obj;
        });

        // Includes changes to nested objects
        const updatedRootObjects = new Set(
            patches.flatMap((p) => {
                const matched = p.path.match(/^\/([^|]*|[^|]*|[^|]*).+/);
                if (!matched) return [];
                const [_, rootKey] = matched;
                const targetObj = this.trackedObjects.get(rootKey);
                if (!targetObj) return [];

                if (targetObj.obj["@shape"] === this.shapeType.shape) {
                    return targetObj.obj;
                }
                return [];
            })
        )
            .values()
            .filter((o) => o.obj["@shape"] === this.shapeType.shape)
            .toArray();

        // Process unlink object patches
        patches.forEach((p) => {
            if (p.op !== "remove") return;
            const matched = p.path.match(
                // Match <root path>/<property name>/<optional object key in set>
                /^\/([^|]*|[^|]*|[^|]*)\/([^/]+)(\/[^/]+)?$/
            );
            if (!matched) return;
            const [_, rootKey, property, maybeObjectKey] = matched;

            const parent = this.trackedObjects.get(rootKey)!;
            if (maybeObjectKey) {
                // Remove object inside a set.
                const objectSet = parent.obj[
                    property
                ] as DeepSignalSet<BaseType>;
                const toRemove = objectSet.getById(maybeObjectKey)!;
                objectSet.delete(toRemove);

                // Decrease refCount and remove from tracked objects if refCount is 0.
                this.unregisterTrackedObject(maybeObjectKey);
            } else if (
                typeof parent.obj[property] === "object" &&
                !(parent.obj[property] instanceof Set)
            ) {
                // Remove object from object.
                const toRemove = parent.obj[property];
                delete parent.obj[property];

                const key = keyFromObject(toRemove);
                // Decrease refCount and remove from tracked objects if refCount is 0.
                this.unregisterTrackedObject(key);
            } else if (
                parent.obj[property] instanceof Set &&
                typeof (
                    parent.obj[property] as DeepSignalSet<BaseType>
                ).first() === "object"
            ) {
                // Remove all objects from set.
                for (const toRemove of parent.obj[property]) {
                    const key = keyFromObject(toRemove);
                    // Decrease refCount and remove from tracked objects if refCount is 0.
                    this.unregisterTrackedObject(key);
                }
                delete parent.obj[property];
            }
        });

        // Handle patches adding/removing literals.
        patches.forEach((p) => {
            // Skip object adds.
            if (
                typeof p.value === "object" &&
                !(Array.isArray(p.value) && typeof p.value[0] !== "object")
            )
                return;

            // Match patches to a property.
            const matched = p.path.match(
                // Match <root path>/<property name>
                /^\/([^|]*|[^|]*|[^|]*)\/([^/]+)$/
            );
            if (!matched) return;
            const [_, parentKey, property] = matched;

            const tracked = this.trackedObjects.get(parentKey)!;
            if (typeof tracked.obj)
                if (p.op === "add" && p.valType === "set") {
                    // Add all values in p.value (might be an array with more than one literal).
                    for (const value of [p.value].flat()) {
                        (tracked.obj[property] as DeepSignalSet<any>).add(
                            value
                        );
                    }
                } else if (p.op === "add") {
                    tracked.obj[property] = p.value;
                } else if (p.op === "remove" && p.valType === "set") {
                    // Remove all values in p.value (might be an array with more than one literal).
                    for (const value of [p.value].flat()) {
                        (tracked.obj[property] as DeepSignalSet<any>).delete(
                            value
                        );
                    }
                } else if (p.op === "remove") {
                    delete tracked.obj[property];
                }
        });

        // TODO: Structural patches
        // if (this.mode === "unordered") {

        // } else if (this.mode === "orderedPaginated") {

        // } else {

        // }

        // Process links to new objects.
        this.changeListeners.forEach((cl) =>
            Object.apply(cl, [
                {
                    adds: newRootObjects,
                    removes: removedRoots,
                    updates: updatedRootObjects,
                },
            ])
        );

        // Use queueMicrotask to ensure watcher is re-enabled _after_ batch completes
        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
        });
    };

    /** Function to create random subject NURIs for newly created nested objects. */
    private attachSignalObjectHandler: OnObjectAttachedFn = ({
        path,
        rawObject: object,
    }) => {
        // Only deal with objects.
        if (Array.isArray(object) || object instanceof Set) return;

        // If we are just applying data coming from the backend, there's nothing to do
        // except for returning the proxied tracked orm objects for replacement with the raw object or reference.
        if (this.suspendDeepWatcher) {
            const tracked =
                this.getTrackedObject(object as any) ??
                this.registerTrackedObject(object as any);
            return {
                replaceWith: tracked,
                syntheticId: keyFromObject(tracked.obj),
            };
        }

        let graphIri: string | undefined = undefined;
        let subjectIri: string | undefined = undefined;

        // If no @graph is set, add the parent's graph NURI. If there is no parent, throw.
        if (!object["@graph"] || object["@graph"] === "") {
            if (path.length > 1) {
                // The first part of the path is the <graphNuri>|<subjectIri> composition.
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

        object["@id"] = subjectIri;
        object["@graph"] = graphIri;
        // Register new object or get reference to it.
        const tracked =
            this.getTrackedObject(object as any) ??
            this.registerTrackedObject(object as any);

        return {
            syntheticId: `${graphIri}|${escapePathSegment(subjectIri!)}|${escapePathSegment(tracked.obj["@shape"])}`,
            replaceWith: tracked.obj,
        };
    };

    /**
     * Begins a transaction that batches changes to be committed to the database.
     * This is useful for performance reasons.
     *
     * Note that this does not disable reactivity of the `signalObject`.
     * Modifications keep being rendered. If in need, use @see structuredClone on the raw object instead.
     *
     * If already in a transaction, this has no effect.
     */
    public beginTransaction = () => {
        this.inTransaction_ = true;
    };

    /**
     * Commits a transactions sending all modifications made during the transaction
     * (started with `beginTransaction`) to the database.
     */
    public commitTransaction = async () => {
        if (!this.inTransaction_) {
            throw new Error(
                "No transaction is open. Call `beginTransaction` first."
            );
        }

        const { ng, session } = await ngSession;
        await this.readyPromise_;

        this.inTransaction_ = false;

        if (this.pendingPatches.length == 0) {
            // Nothing to send to the engine.
        } else {
            // Send patches to engine.
            await ng.graph_orm_update(
                this.subscriptionId!,
                this.pendingPatches!,
                session.session_id
            );
        }

        this.pendingPatches = [];
    };

    /**
     * Loads the next page of items. If `options.maxActivePages` is set and the number of loaded pages
     * exceeds this option, the left-most page will be removed from the loaded pages in signalObject.
     * If no more elements are there to be loaded, nothing happens.
     *
     * **Do not treat the page indexes as absolute numbers**. See the comment in {@link previousPage}.
     *
     * Only available when `options.orderBy` was set in the options of {@link getOrCreate}.
     */
    public nextPage = () => {
        ngSession.then(async ({ ng, session }) => {
            ng.graph_orm_next_page(this.subscriptionId, session.session_id);
        });
    };

    /**
     * Loads the previous page of items. This only has an effect if there were items previously loaded and dropped because
     * `options.maxActivePages` is set and the number of loaded pages exceeded that option.
     * Calling this function will have the effect that the right-most page is dropped.
     *
     * *Warning*: It can happen that items have been added or removed left of the active window (the loaded pages).
     * Therefore there might be more or less pages then initially. As a consequence,
     * the left-most page might be something like `-1` or `1`.
     * **Do not treat the page indexes as absolute numbers**.
     *
     * Only available when `options.orderBy` was set in the options of {@link getOrCreate}.
     */
    public previousPage = () => {
        ngSession.then(async ({ ng, session }) => {
            ng.graph_orm_previous_page(this.subscriptionId, session.session_id);
        });
    };

    public cancelTransaction = async () => {
        //
    };
}

/**
 * Creates a string out of the scope in the format
 * `graphIri1,graphIri2|subjectIri1,subjectIri2`
 */
function canonicalScope(scope: NormalizedScope): string {
    if (!scope) return "";
    return `${(scope.graphs || []).slice().sort().join(",")}|${(scope.subjects || []).slice().sort().join(",")}`;
}

function deepPatchesToWasm(patches: DeepPatch[]): Patch[] {
    return patches.flatMap((patch) => {
        if (patch.op === "add" && patch.type === "set" && !patch.value?.length)
            return [];

        // TODO: pagination.

        // Escape property name.
        const pathSegments = [...patch.path];
        if (pathSegments.length > 1)
            pathSegments[1] = escapePathSegment(String(pathSegments[1] ?? ""));
        const path = pathSegments.join("/");

        if (isDeepSignal(patch.value)) {
            return {
                ...patch,
                path,
                value: {
                    "@id": (patch.value as any)?.["@id"],
                },
            };
        }

        if (patch.op === "remove" && typeof patch.value === "object") {
            // Don't include the removed object in the patch (only for literals). The path is enough for the engine.
            return { ...patch, path, value: undefined };
        }
        return { ...patch, path };
    }) as Patch[];
}

function keyFromObject(obj: BaseType) {
    return `/${obj["@graph"]}|${escapePathSegment(obj["@id"])}|${escapePathSegment(obj["@shape"])}`;
}

type NormalizedOrmOptions<ST extends ShapeType<any>> = Omit<
    OrmConfig<ST>,
    "subjects" | "graphs"
> & { graphs: string[]; subjects: string[] };

/** The {@link OrmSubscription} for a given {@link OrmConfig}. */
type OrmSubscriptionFor<
    ST extends ShapeType<any>,
    OP extends OrmConfig<ST>,
    T extends BaseType = ST extends ShapeType<infer T_> ? T_ : never,
> = undefined extends OP["pageSize"]
    ? Omit<OrmSubscription<ST, OP, T>, "nextPage" | "previousPage"> // No pagination functions.
    : undefined extends OP["maxActivePages"]
      ? Omit<OrmSubscription<ST, OP, T>, "nextPage"> // Only forward pagination without `maxActivePages`.
      : OrmSubscription<ST, OP, T>; // Forward and backwards pagination.

type OrmChangeListener<T> = (changes: {
    adds: T[];
    updates: T[];
    removes: T[];
}) => void;
