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

const WAIT_BEFORE_CLOSE = 500;

export class OrmConnection<T extends BaseType> {
    private static idToEntry = new Map<string, OrmConnection<any>>();
    /**
     * Delay in ms to wait before closing connection.\
     * Useful when a hook unsubscribes and resubscribes in a short time interval
     * so that no new connections need to be set up.
     */

    readonly shapeType: ShapeType<T>;
    readonly scope: Scope;
    readonly signalObject: DeepSignalSet<T>;
    private subscriptionId: number | undefined;
    private refCount: number;
    /** Identifier as a combination of shape type and scope. Prevents duplications. */
    private identifier: string;
    suspendDeepWatcher: boolean;
    inTransaction: boolean = false;
    /** Aggregation of patches to be sent when in transaction. */
    pendingPatches: Patch[] | undefined;
    readyPromise: Promise<void>;
    private closeOrmConnection: () => void;
    /** Promise that resolves once initial data has been applied. */
    resolveReady!: () => void;

    // FinalizationRegistry to clean up connections when signal objects are GC'd.
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
        watchDeepSignal(this.signalObject, this.onSignalObjectUpdate);

        // Initialize per-entry readiness promise that resolves in setUpConnection
        this.readyPromise = new Promise<void>((resolve) => {
            this.resolveReady = resolve;
        });

        ngSession.then(async ({ ng, session }) => {
            try {
                this.closeOrmConnection = await ng.graph_orm_start(
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
     * Get or create a connection which contains the ORM and lifecycle methods.
     * @param shapeType
     * @param scope
     * @param ng
     * @returns
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

    private onSignalObjectUpdate = async ({ patches }: WatchPatchEvent<T>) => {
        if (this.suspendDeepWatcher || !patches.length) return;

        const ormPatches = deepPatchesToWasm(patches);

        // Wait for session and subscription to be initialized.
        const { ng, session } = await ngSession;
        await this.readyPromise;

        if (this.inTransaction) {
            this.pendingPatches?.push(...ormPatches);
        } else {
            ng.graph_orm_update(
                this.subscriptionId!,
                ormPatches,
                session.session_id
            );
        }
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
        // Assign initial data to empty signal object without triggering watcher at first.
        this.suspendDeepWatcher = true;
        batch(() => {
            // Note: Instead, we await for the connection to be initialized and send patches after. So no need to remove.
            // // Do this in case the there was any (incorrect) data added before initialization.
            // this.signalObject.clear();

            // Convert arrays to sets and apply to signalObject (we only have sets but can only transport arrays).
            for (const newItem of parseDiscreteOrmInitialObject(initialData)) {
                this.signalObject.add(newItem);
            }
        });

        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
            // Resolve readiness after initial data is committed and watcher armed.
            this.resolveReady();
        });
    };
    private onBackendUpdate = (patches: Patch[]) => {
        this.suspendDeepWatcher = true;
        applyPatchesToDeepSignal(this.signalObject, patches);
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

    public beginTransaction = () => {
        this.inTransaction = true;
        this.pendingPatches = [];
    };

    public commitTransaction = async () => {
        if (!this.pendingPatches) {
            throw new Error(
                "No transaction is open. Call `beginTransaction` first."
            );
        }

        if (this.pendingPatches.length == 0) {
            return;
        }

        this.inTransaction = false;
        const { ng, session } = await ngSession;
        await this.readyPromise;
        ng.graph_orm_update(
            this.subscriptionId!,
            this.pendingPatches!,
            session.session_id
        );

        this.pendingPatches = undefined;
    };
}

const parseDiscreteOrmInitialObject = (obj: any): any => {
    // Regular arrays become sets.
    if (Array.isArray(obj)) {
        return new Set(obj.map(parseDiscreteOrmInitialObject));
    } else if (obj && typeof obj === "object") {
        if ("@id" in obj) {
            // Regular object.
            for (const key of Object.keys(obj)) {
                obj[key] = parseDiscreteOrmInitialObject(obj[key]);
            }
        } else {
            // Object does not have @id, that means it's a set of objects.
            return new Set(
                Object.values(obj).map(parseDiscreteOrmInitialObject)
            );
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
