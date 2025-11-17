// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { Diff as Patches, Scope } from "../types.ts";
import {
    applyPatches,
    applyPatchesToDeepSignal,
    Patch,
} from "./applyPatches.ts";

import { ngSession } from "./initNg.ts";

import {
    deepSignal,
    watch as watchDeepSignal,
    batch,
} from "@ng-org/alien-deepsignals";
import type {
    DeepPatch,
    DeepSignalObject,
    DeepSignalPropGenFn,
    DeepSignalSet,
    WatchPatchEvent,
} from "@ng-org/alien-deepsignals";
import type { ShapeType, BaseType } from "@ng-org/shex-orm";

export class OrmConnection<T extends BaseType> {
    // TODO: WeakMaps?
    private static idToEntry = new Map<string, OrmConnection<any>>();

    readonly shapeType: ShapeType<T>;
    readonly scope: Scope;
    readonly signalObject: DeepSignalSet<T>;
    private refCount: number;
    /*** Identifier as a combination of shape type and scope. Prevents duplications. */
    private identifier: string;
    ready: boolean;
    suspendDeepWatcher: boolean;
    readyPromise: Promise<void>;
    // Promise that resolves once initial data has been applied.
    resolveReady!: () => void;

    // FinalizationRegistry to clean up connections when signal objects are GC'd.
    private static cleanupSignalRegistry =
        typeof FinalizationRegistry === "function"
            ? new FinalizationRegistry<string>((connectionId) => {
                  // Best-effort fallback; look up by id and clean
                  const entry = this.idToEntry.get(connectionId);
                  if (!entry) return;
                  entry.release();
              })
            : null;

    private constructor(shapeType: ShapeType<T>, scope: Scope) {
        this.shapeType = shapeType;
        this.scope = scope;
        this.refCount = 0;
        this.ready = false;
        this.suspendDeepWatcher = false;
        this.identifier = `${shapeType.shape}::${canonicalScope(scope)}`;
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
            //console.log("Creating orm connection. ng and session", ng, session);
            try {
                //await new Promise((resolve) => setTimeout(resolve, 4_000));
                ng.orm_start(
                    (scope.length == 0
                        ? "" // + session.private_store_id
                        : scope) as string,
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
     * Get a connection which contains the ORM and lifecycle methods.
     * @param shapeType
     * @param scope
     * @param ng
     * @returns
     */
    public static getConnection = <T extends BaseType>(
        shapeType: ShapeType<T>,
        scope: Scope
    ): OrmConnection<T> => {
        const scopeKey = canonicalScope(scope);

        // Unique identifier for a given shape type and scope.
        const identifier = `${shapeType.shape}::${scopeKey}`;

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

    public release = () => {
        if (this.refCount > 0) this.refCount--;
        if (this.refCount === 0) {
            OrmConnection.idToEntry.delete(this.identifier);

            OrmConnection.cleanupSignalRegistry?.unregister(this.signalObject);
        }
    };

    private onSignalObjectUpdate = ({ patches }: WatchPatchEvent) => {
        if (this.suspendDeepWatcher || !this.ready || !patches.length) return;
        console.debug("[onSignalObjectUpdate] got changes:", patches);

        const ormPatches = deepPatchesToWasm(patches);

        ngSession.then(({ ng, session }) => {
            ng.orm_update(
                (this.scope.length == 0
                    ? "" // + session.private_store_id
                    : this.scope) as string,
                this.shapeType.shape,
                ormPatches,
                session.session_id
            );
        });
    };

    private onBackendMessage = ({ V0: data }: any) => {
        if (data.OrmInitial) {
            this.handleInitialResponse(data.OrmInitial);
        } else if (data.OrmUpdate) {
            this.onBackendUpdate(data.OrmUpdate);
        } else {
            console.warn("Received unknown ORM message from backend", data);
        }
    };

    private handleInitialResponse = (initialData: any) => {
        // console.debug(
        //     "[handleInitialResponse] handleInitialResponse called with",
        //     initialData
        // );

        // Assign initial data to empty signal object without triggering watcher at first.
        this.suspendDeepWatcher = true;
        batch(() => {
            // Do this in case the there was any (incorrect) data added before initialization.
            this.signalObject.clear();
            // Convert arrays to sets and apply to signalObject (we only have sets but can only transport arrays).
            for (const newItem of parseOrmInitialObject(initialData)) {
                this.signalObject.add(newItem);
            }
            // console.log(
            //     "[handleInitialResponse] signal object:",
            //     this.signalObject
            // );
        });

        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
            // Resolve readiness after initial data is committed and watcher armed.
            this.resolveReady?.();
        });

        this.ready = true;
    };
    private onBackendUpdate = (patches: Patch[]) => {
        // console.log(
        //     "connectionHandler: onBackendUpdate. Got patches:",
        //     patches
        // );

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
            console.debug(
                "Generating new random id for path",
                path,
                "object:",
                object
            );

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
                (path[0] as string).substring(0, 9 + 44) + ":q:" + randomString;
        }

        return {
            extraProps: { "@id": subjectIri, "@graph": graphIri },
            syntheticId: graphIri + "|" + subjectIri,
        };
    };
}

/**
 * Converts DeepSignal patches to ORM Wasm-compatible patches
 * @param patches DeepSignal patches
 * @returns Patches with stringified path
 */
export function deepPatchesToWasm(patches: DeepPatch[]): Patches {
    return patches.map((patch) => {
        const path = "/" + patch.path.join("/");
        return { ...patch, path };
    }) as Patches;
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

function canonicalScope(scope: Scope | undefined): string {
    if (scope == null) return "";
    return Array.isArray(scope)
        ? scope.slice().sort().join(",")
        : String(scope);
}
