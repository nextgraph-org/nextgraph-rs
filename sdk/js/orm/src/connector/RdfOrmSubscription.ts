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
import { applyPatches, parseOrmInitialObject, Patch } from "./applyPatches.ts";

import { ngSession } from "./initNg.ts";

import {
    deepSignal,
    watch as watchDeepSignal,
    batch,
    readOnlyArray,
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
    ReadOnlyArray,
} from "@ng-org/alien-deepsignals";
import type { ShapeType, BaseType } from "@ng-org/shex-orm";
import { OrderByConfig, RdfOrmConfig, SubscriptionData } from "../utilTypes.ts";
import { escapePathSegment } from "./utils.ts";

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
 * - Call {@link RdfOrmSubscription.getOrCreate} to create a subscription manually
 *
 * For more information about RDF-based ORM subscriptions,
 * see the README and follow the tutorial.
 */
export class RdfOrmSubscription<
    ST extends ShapeType<any>,
    CONF extends RdfOrmConfig<T>,
    T extends BaseType = ST extends ShapeType<infer T_> ? T_ : never,
    SUBSCRIPTION_DATA = SubscriptionData<T, CONF>,
> {
    /** Global store of all subscriptions. We use that for pooling. */
    private static idToEntry = new Map<
        string,
        RdfOrmSubscription<any, any, any>
    >();

    /** The shape type that is subscribed to. */
    readonly shapeType: ShapeType<T>;
    /** The {@link Scope} of the subscription. */
    readonly scope: Scope;
    /**
     * The ordering mode which depends on the passed subscription's {@link OrderByConfig}.
     * - `unordered`: The root object is a set (no `orderBy` config set)
     * - `orderedUnpaginated`: `orderBy` is set but `pageSize` not
     *     -> `signalObject` is an array of all items matching the shape and scope.
     * - `orderedPaginatedSimple`: `orderBy`, `pageSize`, and `maxActivePages` are set
     *     -> `signalObject` is an array but only contains the items of the loaded pages.
     *         Pages will be removed from `signalObject` when more pages are loaded than `maxActivePages` allows.
     *         You can call {@link nextPage} and {@link previousPage} to navigate.
     * - `orderedPaginatedCumulative`: `orderBy` and `pageSize` is set but `maxActivePages` not
     *     -> `signalObject` is an array but only contains all loaded pages so far.
     *         You can call {@link nextPage} but not {@link previousPage}.
     */
    readonly mode:
        | "unordered"
        | "orderedPaginatedCumulative"
        | "orderedPaginatedSimple"
        | "orderedUnpaginated";

    /**
     * The signalObject containing all data matching the shape and scope
     * (once subscription is established).
     * Depending on the [orderBy config]({@link OrderByConfig}), the object is a set or an array.
     * See {@link mode} for more details.
     *
     * This object is a reactive {@link DeepSignal} object.
     * To the outside behaves like a regular object but has a couple of
     * additional features:
     * - Modifications are immediately propagated back to the database.
     * - Database changes are immediately reflected in the object.
     * - `.getBy(graphIri, subjectIri)` utility for quicker access to objects in sets.
     * - `.first()` utility to get the first element added to the set.
     * - the iterator utilities, e.g. `.map()`, `.filter()`, ...
     * - Watch for object changes using {@link watchDeepSignal}.
     * - Use can use them in {@link effect} and {@link computed}.
     * - When used in the frontend with `useShape()`, modifications trigger rerenders.
     */
    get signalObject() {
        return (this.readonlyItemsArray ??
            this.signalObject_) as SUBSCRIPTION_DATA;
    }
    private readonly signalObject_: undefined extends CONF["orderBy"]
        ? DeepSignalSet<T>
        : DeepSignal<T[]>;
    private readonlyItemsArray?: ReadOnlyArray<T>;

    /** Listeners that get notified when root objects are added, updated, or removed. */
    private changeListeners: Set<OrmChangeListener<T>> = new Set();
    private stopSignalListening: () => void;
    /** The subscription ID kept as an identifier for communicating with the verifier. */
    private subscriptionId: number | undefined;
    /** The number of RdfOrmSubscriptions with the same shape and options (for pooling). */
    private refCount: number;
    /** Identifier as a canonicalization of the shape type and options, to prevent duplications. */
    private identifier: string;
    /** When true, modifications of the signalObject are not propagated to backend. */
    private suspendDeepWatcher: boolean = false;
    /** True, if a transaction is running. */
    private inTransaction_: boolean = false;
    /** Aggregation of patches to be sent when in transaction. @ignore */
    private pendingPatches: Patch[] = [];
    /** **Await to ensure that the subscription is established and the data arrived.** */
    private readyPromise_: Promise<SUBSCRIPTION_DATA>;
    private closeOrmSubscription: () => void;
    /** Function to call once initial data has been applied. */
    private resolveReady!: (data: SUBSCRIPTION_DATA) => void;
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
        options: NormalizedOrmOptions<T>,
        identifier: string
    ) {
        // @ts-expect-error
        window.rdfOrmSignalConnections = RdfOrmSubscription.idToEntry;
        // @ts-expect-error
        window.RdfOrmSubscription = RdfOrmSubscription;

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
            this.mode = "orderedPaginatedSimple";
        }

        // Base signalObject depends on ordering and pagination settings.
        let baseObject = options.orderBy ? [] : new Set();

        this.signalSettings = {
            onObjectAttached: this.attachSignalObjectHandler,

            readOnlyProps: ["@id", "@graph", "@shape"],
        } as DeepSignalOptions;
        this.signalObject_ = deepSignal(baseObject as any, this.signalSettings);

        // Create the read-only proxy for ordered arrays.
        if (Array.isArray(this.signalObject_)) {
            this.readonlyItemsArray = readOnlyArray(this.signalObject_);
        }

        // Schedule cleanup of the connection when the signal object is GC'd.
        RdfOrmSubscription.cleanupSignalRegistry?.register(
            this.signalObject_,
            this.identifier,
            this.signalObject_
        );

        // Add listener to deep signal object to report changes back to wasm land.
        const { stopListening } = watchDeepSignal(
            this.signalObject_,
            this.onSignalObjectUpdate,
            { triggerInstantly: true }
        );
        this.stopSignalListening = stopListening;

        // Set promise to be resolved when data arrived from engine.
        this.readyPromise_ = new Promise<SUBSCRIPTION_DATA>((resolve) => {
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
     * Returns an RdfOrmSubscription which subscribes to the given
     * {@link ShapeType} and {@link Scope} in a 2-way binding.
     *
     * You **find the data** and objects matching the shape and scope
     * in the **`signalObject`** once {@link readyPromise} resolves.
     *
     * The {@link signalObject} is either an array if you specify an `orderBy`
     * in the options or a set otherwise.
     *
     * To the outside, the signalObject behaves like a regular Set or Array
     * but it has a couple of additional properties:
     * - Modifications are propagated back to the database.
     *   Note that multiple immediate modifications in the same task,
     *   e.g. `obj[0] = "foo"; obj[1] = "bar"` are batched together
     *   and sent in a subsequent microtask.
     * - Database changes are immediately reflected in the object.
     * - `.getBy(graphIri, subjectIri)` utility for quicker access to objects in set.
     * - `.first()` utility to get the first element added to the set (useful when you know that it is only one).
     * - The iterator utilities, e.g. `.map()`, `.filter()`, ...
     * - Use the object with alien-deepsignal functions like
     *   {@link effect}, {@link computed}, or {@link watchDeepSignal}.
     *
     *
     * You can (and should) use **transactions**, to prevent excessive calls to the database
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
     * it will return the same RdfOrmSubscription.
     *
     * @param shapeType The {@link ShapeType}
     * @param options The {@link RdfOrmConfig}.
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
     * const subscription = RdfOrmSubscription.getOrCreate(ExpenseShapeType, {graphs: [documentId]});
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
     * const subscription2 = RdfOrmSubscription.getOrCreate(ExpenseShapeType, {graphs: [documentId]});
     *
     * subscription2.signalObject.add({
     *    "@graph": documentId,
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
        T extends BaseType,
        const CONF extends RdfOrmConfig<T>,
    >(
        shapeType: ShapeType<T>,
        options: CONF
    ): RdfOrmSubscriptionFor<ST, CONF, T> => {
        const { graphs, subjects, maxActivePages, orderBy, pageSize } = options;
        const normalizedScope = normalizeScope({ graphs, subjects });
        const scopeKey = canonicalScope(normalizedScope);
        // If we have pagination active, we can't pool subscriptions because
        // otherwise calling the next page on one would effect the other.
        const optionsKey = pageSize
            ? Math.random().toString()
            : JSON.stringify({
                  orderBy,
              });

        // Unique identifier for a given shape type, scope, and options.
        const identifier = `${shapeType.shape}|${scopeKey}|${optionsKey}`;

        // If we already have an object for this options,
        // return it and just increase the reference count.
        // Otherwise, create new one.
        const existingConnection = RdfOrmSubscription.idToEntry.get(identifier);
        if (existingConnection) {
            existingConnection.refCount += 1;
            return existingConnection as any;
        } else {
            const newConnection = new RdfOrmSubscription(
                shapeType,
                {
                    ...normalizedScope,
                    maxActivePages,
                    orderBy,
                    pageSize,
                },
                identifier
            );
            RdfOrmSubscription.idToEntry.set(identifier, newConnection as any);
            return newConnection as any;
        }
    };

    /** True, if a transaction is active. */
    get inTransaction() {
        return this.inTransaction_;
    }
    /** Await to ensure that the subscription is established and the data arrived. */
    get readyPromise() {
        return this.readyPromise_;
    }
    /** Returns true when {@link readyPromise} resolved. */
    private isReady_ = false;
    get isReady(): boolean {
        return this.isReady_;
    }

    /**
     * Stop the subscription.
     *
     * **If there is more than one subscription with the same shape type and scope, and no pagination,
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
                RdfOrmSubscription.idToEntry.delete(this.identifier);

                RdfOrmSubscription.cleanupSignalRegistry?.unregister(
                    this.signalObject_
                );

                // for (const [_key, objMeta] of this.trackedObjects) {
                //     objMeta.stopListening();
                // }
                this.stopSignalListening();
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

        // Send patches to engine.
        this.queuePatches({ patches: this.deepPatchesToWasm(patches) });
    };

    /** Add patches to {@link pendingPatches}. Schedules a microtask to send them to the backend batched, if not in transaction. */
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
            if (this.signalObject_ instanceof Set) {
                for (const newItem of parseOrmInitialObject(initialData)) {
                    (this.signalObject_ as DeepSignalSet<T>).add(newItem);
                }
            } else {
                for (const newItem of initialData) {
                    this.signalObject_.push(parseOrmInitialObject(newItem));
                }
            }
        });

        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
            // Resolve readiness after initial data is committed and watcher armed.
            this.isReady_ = true;
            this.resolveReady(this.signalObject);
        });
    };

    /** Handle incoming patches from the engine */
    private onBackendUpdate = (patches: Patch[]) => {
        this.suspendDeepWatcher = true;

        // Apply patches to signal object.
        batch(() => {
            applyPatches(this.signalObject_, patches);
        });

        const addedRoots = patches.flatMap((p) => {
            if (p.op !== "add" || typeof p.value !== "object") return [];

            const match = p.path.match(/^\/([0-9]*)$/); // Targets root set or position in array.
            if (!match) return [];
            const syntheticIdOrIndex = match[1];

            if (Array.isArray(this.signalObject_)) {
                return this.signalObject_[
                    Number(syntheticIdOrIndex)
                ] as DeepSignal<T>;
            } else {
                return this.signalObject_.getById(
                    syntheticIdOrIndex
                ) as DeepSignal<T>;
            }
        });

        const removedRoots = patches.flatMap((p) => {
            if (p.op !== "remove") return [];

            const rootPathMatch = p.path.match(/^\/([^/]+)$/); // Targets root (no slashes).
            if (!rootPathMatch) return [];

            if (this.signalObject_ instanceof Set) {
                return this.signalObject_.getById(
                    rootPathMatch[1]!
                ) as DeepSignal<T>;
            } else {
                return this.signalObject_[
                    Number(rootPathMatch[1])
                ] as DeepSignal<T>;
            }
        });

        // Modification to object or nested objects.
        const updatedRootObjects = new Set(
            patches.flatMap((p) => {
                const matched = p.path.match(/^\/([^|]*\|[^|]*)\/.+/);
                if (!matched) return [];
                const [_, rootKey] = matched;

                if (this.signalObject_ instanceof Set) {
                    return this.signalObject_.getById(rootKey) as DeepSignal<T>;
                } else {
                    return this.signalObject_[Number(rootKey)] as DeepSignal<T>;
                }
            })
        );

        // Process links to new objects.
        this.changeListeners.forEach((cl) =>
            Object.apply(cl, [
                {
                    adds: addedRoots,
                    removes: removedRoots,
                    updates: [...updatedRootObjects],
                },
            ])
        );

        // Use queueMicrotask to ensure watcher is re-enabled _after_ batch completes
        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
        });
    };

    /**
     * On new objects being attached, this function ensures that `@id` and `@graph` are set (possibly by generating/adding them).
     * If the parent is a set, generates a synthetic id (used for path creation).
     */
    private attachSignalObjectHandler: OnObjectAttachedFn = ({
        rawObject,
        rawParent,
        meta,
    }) => {
        // Only deal with objects.
        if (Array.isArray(rawObject) || rawObject instanceof Set) return;

        // If we are just applying data coming from the backend,
        // `@graph` and `@id` will be set already. Just generated syntheticId, if parent is a set.
        if (this.suspendDeepWatcher) {
            if (rawParent instanceof Set) {
                return {
                    syntheticId: syntheticIdFromObject(rawObject as BaseType),
                };
            } else {
                return;
            }
        }

        let graphIri: string | undefined = undefined;
        let subjectIri: string | undefined = undefined;

        // If no @graph is set, add the parent's graph NURI. If there is no parent, throw.
        if (!rawObject["@graph"] || rawObject["@graph"] === "") {
            // Check if the parent has a @graph. `parent.parent` might have a graph is parent is a set.
            graphIri =
                (rawParent as any)["@graph"] ??
                (meta.parent?.parent?.raw as any)?.["graph"];
        } else {
            graphIri = rawObject["@graph"];
        }
        if (!graphIri) {
            throw new Error(
                "The object's @graph is missing and could not be inferred."
            );
        }

        if (rawObject["@id"] && rawObject["@id"] !== "") {
            subjectIri = rawObject["@id"];
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

            subjectIri = graphIri.substring(0, 9 + 44) + ":q:" + randomString;
        }

        rawObject["@id"] = subjectIri;
        rawObject["@graph"] = graphIri;

        if (rawParent instanceof Set) {
            return {
                syntheticId: syntheticIdFromObject(rawObject as BaseType),
            };
        } else {
            return;
        }
    };

    /**
     * Begins a transaction that batches changes to be committed to the database.
     * This is useful for performance reasons.
     *
     * Note that this does not disable reactivity of the `signalObject`.
     * Modifications keep being rendered. If in need, use {@link structuredClone} on the raw object instead.
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
     * Loads the next page of items. If `options.maxActivePages` is set and the number of items
     * exceeds the allowed one (`pageSize` × `maxActivePages`), the left-most items will be removed from the {@link signalObject} array.
     * If no more elements are there to be loaded, nothing happens.
     *
     * Only available when `orderBy` and `pageSize` were set in the options of {@link getOrCreate}.
     */
    public nextPage = () => {
        ngSession.then(async ({ ng, session }) => {
            await this.readyPromise;
            ng.graph_orm_next_page(this.subscriptionId, session.session_id);
        });
    };

    /**
     * Loads the previous page of items. This only has an effect if there were items previously loaded and dropped because
     * more items were loaded than allowed (configured through `pageSize` × `maxActivePages`).
     *
     * Calling this function will have the effect that the right-most items are dropped.
     *
     *
     * Only available when `orderBy`, `pageSize`, and `maxActivePages` were set in the options of {@link getOrCreate}.
     */
    public previousPage = () => {
        ngSession.then(async ({ ng, session }) => {
            await this.readyPromise;
            ng.graph_orm_previous_page(this.subscriptionId, session.session_id);
        });
    };

    // public cancelTransaction = async () => {
    //     // TODO
    // };

    private deepPatchesToWasm(patches: DeepPatch[]): Patch[] {
        const ret = patches.flatMap((patch) => {
            if (
                patch.op === "add" &&
                patch.type === "set" &&
                !patch.value?.length
            )
                return [];

            let path: string;
            if (Array.isArray(this.signalObject_)) {
                const rootObjIndex = Number(patch.path[0]);
                const rootKey = syntheticIdFromObject(
                    this.signalObject_[rootObjIndex]
                );
                path = `/${rootKey}/${patch.path.join("/")}`;
            } else {
                path = `/${patch.path.join("/")}`;
            }

            if (patch.op === "remove" && typeof patch.value === "object") {
                // Don't include the removed object's value in the patch (only for literals).
                // The path with its synthetic id is enough.
                return { ...patch, path, value: undefined };
            }
            return { ...patch, path };
        }) as Patch[];

        return ret;
    }
}

/**
 * Creates a string out of the scope in the format
 * `graphIri1,graphIri2|subjectIri1,subjectIri2`
 */
function canonicalScope(scope: NormalizedScope): string {
    if (!scope) return "";
    return `${(scope.graphs || []).slice().sort().join(",")}|${(scope.subjects || []).slice().sort().join(",")}`;
}

function syntheticIdFromObject(obj: BaseType) {
    return `${obj["@graph"]}|${escapePathSegment(obj["@id"])}`;
}

type NormalizedOrmOptions<T extends BaseType> = Omit<
    RdfOrmConfig<T>,
    "subjects" | "graphs"
> & { graphs: string[]; subjects: string[] };

/** The {@link RdfOrmSubscription} for a given {@link RdfOrmConfig}. */
export type RdfOrmSubscriptionFor<
    ST extends ShapeType<any>,
    CONF extends RdfOrmConfig<T>,
    T extends BaseType = ST extends ShapeType<infer T_> ? T_ : never,
> = undefined extends CONF["pageSize"]
    ? Omit<RdfOrmSubscription<ST, CONF, T>, "nextPage" | "previousPage"> // No pagination functions.
    : undefined extends CONF["maxActivePages"]
      ? Omit<RdfOrmSubscription<ST, CONF, T>, "previousPage"> // Only forward pagination without `maxActivePages`.
      : RdfOrmSubscription<ST, CONF, T>; // Forward and backwards pagination.

export type OrmChangeListener<T> = (changes: {
    adds: DeepSignal<T>[];
    updates: DeepSignal<T>[];
    removes: DeepSignal<T>[];
}) => void;

// const conf = {
//     graphs: [""],
//     orderBy: { foo: "asc" },
//     pageSize: 2,
// } satisfies OrmConfig<any>;
// const test: RdfOrmSubscriptionFor<ShapeType<BaseType>, typeof conf>;
// test.nextPage;
