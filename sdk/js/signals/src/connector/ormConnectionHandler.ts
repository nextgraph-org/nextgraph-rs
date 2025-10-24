import type { Diff as Patches, Scope } from "../types.ts";
import { applyDiff, applyDiffToDeepSignal, Patch } from "./applyDiff.ts";

import { ngSession } from "./initNg.ts";

import {
    deepSignal,
    watch as watchDeepSignal,
    batch,
} from "@ng-org/alien-deepsignals";
import type {
    DeepPatch,
    DeepSignalObject,
    WatchPatchEvent,
} from "@ng-org/alien-deepsignals";
import type { ShapeType, BaseType } from "@ng-org/shex-orm";

export class OrmConnection<T extends BaseType> {
    // TODO: WeakMaps?
    private static idToEntry = new Map<string, OrmConnection<any>>();

    readonly shapeType: ShapeType<T>;
    readonly scope: Scope;
    readonly signalObject: DeepSignalObject<Set<T>>;
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
            addIdToObjects: true,
            idGenerator: this.generateSubjectIri,
        });

        // Schedule cleanup of the connection when the signal object is GC'd.
        OrmConnection.cleanupSignalRegistry?.register(
            this.signalObject,
            this.identifier,
            this.signalObject
        );

        // Add listener to deep signal object to report changes back to wasm land.
        watchDeepSignal<Set<T>>(this.signalObject, this.onSignalObjectUpdate);

        // Initialize per-entry readiness promise that resolves in setUpConnection
        this.readyPromise = new Promise<void>((resolve) => {
            this.resolveReady = resolve;
        });

        ngSession.then(async ({ ng, session }) => {
            console.log("Creating orm connection. ng and session", ng, session);
            try {
                await new Promise((resolve) => setTimeout(resolve, 4_000));
                ng.orm_start(
                    (scope.length == 0
                        ? "did:ng:" + session.private_store_id
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

    private onSignalObjectUpdate = ({ patches }: WatchPatchEvent<Set<T>>) => {
        if (this.suspendDeepWatcher || !this.ready || !patches.length) return;

        const ormPatches = deepPatchesToDiff(patches);

        ngSession.then(({ ng, session }) => {
            ng.orm_update(
                (this.scope.length == 0
                    ? "did:ng:" + session.private_store_id
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
        console.debug(
            "[handleInitialResponse] handleInitialResponse called with",
            initialData
        );

        // Assign initial data to empty signal object without triggering watcher at first.
        this.suspendDeepWatcher = true;
        batch(() => {
            // Do this in case the there was any (incorrect) data added before initialization.
            this.signalObject.clear();
            // Convert arrays to sets and apply to signalObject (we only have sets but can only transport arrays).
            for (const newItem of recurseArrayToSet(initialData)) {
                this.signalObject.add(newItem);
            }
            console.log(
                "[handleInitialResponse] signal object:",
                this.signalObject
            );
        });

        queueMicrotask(() => {
            this.suspendDeepWatcher = false;
            // Resolve readiness after initial data is committed and watcher armed.
            this.resolveReady?.();
        });

        this.ready = true;
    };
    private onBackendUpdate = (patches: Patch[]) => {
        console.log(
            "connectionHandler: onBackendUpdate. Got patches:",
            patches
        );

        applyDiffToDeepSignal(this.signalObject, patches);
    };

    /** Function to create random subject IRIs for newly created nested objects. */
    private generateSubjectIri = (path: (string | number)[]): string => {
        // Generate random string.
        let b = Buffer.alloc(33);
        crypto.getRandomValues(b);
        const randomString = b.toString("base64url");

        if (path.length > 0 && path[0].toString().startsWith("did:ng:o:")) {
            // If the root is a nuri, use that as a base IRI.
            let rootNuri = path[0] as string;

            return rootNuri.substring(0, 9 + 44) + ":q:" + randomString;
        } else {
            // Else, just generate a random IRI.
            return "did:ng:q:" + randomString;
        }
    };
}

//
//

function escapePathSegment(segment: string): string {
    return segment.replace("~", "~0").replace("/", "~1");
}

export function deepPatchesToDiff(patches: DeepPatch[]): Patches {
    return patches.map((patch) => {
        const path =
            "/" +
            patch.path.map((el) => escapePathSegment(el.toString())).join("/");
        return { ...patch, path };
    }) as Patches;
}

const recurseArrayToSet = (obj: any): any => {
    if (Array.isArray(obj)) {
        return new Set(obj.map(recurseArrayToSet));
    } else if (obj && typeof obj === "object" && obj instanceof Map) {
        return Object.fromEntries(obj.entries());
    } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj)) {
            obj[key] = recurseArrayToSet(obj[key]);
        }
        return obj;
    } else {
        return obj;
    }
};

function canonicalScope(scope: Scope | undefined): string {
    if (scope == null) return "";
    return Array.isArray(scope)
        ? scope.slice().sort().join(",")
        : String(scope);
}
