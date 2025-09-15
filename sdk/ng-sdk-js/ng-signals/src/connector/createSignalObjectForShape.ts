import type { Diff, Scope } from "../types.ts";
import { applyDiff } from "./applyDiff.ts";

import {
    deepSignal,
    watch,
    batch,
} from "@nextgraph-monorepo/ng-alien-deepsignals";
import type {
    DeepPatch,
    DeepSignalObject,
} from "@nextgraph-monorepo/ng-alien-deepsignals";
import type { ShapeType, OrmBase } from "@nextgraph-monorepo/ng-shex-orm";

interface PoolEntry<T extends OrmBase> {
    connectionId: string;
    key: string;
    shapeType: ShapeType<T>;
    scopeKey: string;
    signalObject: DeepSignalObject<T | {}>;
    refCount: number;
    suspendDeepWatcher: boolean;
    ready: boolean;
    // Promise that resolves once initial data has been applied.
    readyPromise: Promise<void>;
    resolveReady: () => void;
    release: () => void;
}

interface WasmMessage {
    type:
        | "Request"
        | "InitialResponse"
        | "FrontendUpdate"
        | "BackendUpdate"
        | "Stop";
    connectionId: string;
    diff?: Diff;
    shapeType?: ShapeType<any>;
    initialData?: OrmBase;
}

function canonicalScope(scope: Scope | undefined): string {
    if (scope == null) return "";
    return Array.isArray(scope)
        ? scope.slice().sort().join(",")
        : String(scope);
}

export function deepPatchesToDiff(patches: DeepPatch[]): Diff {
    return patches.map((patch) => {
        const path = "/" + patch.path.join("/");
        return { ...patch, path };
    }) as Diff;
}

const recurseArrayToSet = (obj: any): any => {
    if (Array.isArray(obj)) {
        return new Set(obj.map(recurseArrayToSet));
    } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj)) {
            obj[key] = recurseArrayToSet(obj[key]);
        }
        return obj;
    } else {
        return obj;
    }
};

const setUpConnection = (entry: PoolEntry<any>, wasmMessage: WasmMessage) => {
    const { connectionId, initialData } = wasmMessage;

    const { signalObject } = entry;

    // Assign initial data to empty signal object without triggering watcher at first.
    entry.suspendDeepWatcher = true;
    batch(() => {
        // Convert arrays to sets and apply to signalObject (we only have sets but can only transport arrays).
        Object.assign(signalObject, recurseArrayToSet(initialData)!);
    });

    // Add listener to deep signal object to report changes back to wasm land.
    const watcher = watch(signalObject, ({ patches }) => {
        if (entry.suspendDeepWatcher || !patches.length) return;

        const diff = deepPatchesToDiff(patches);

        // Send FrontendUpdate message to wasm land.
        const msg: WasmMessage = {
            type: "FrontendUpdate",
            connectionId,
            diff: JSON.parse(JSON.stringify(diff)),
        };
        communicationChannel.postMessage(msg);
    });

    queueMicrotask(() => {
        entry.suspendDeepWatcher = false;
        // Resolve readiness after initial data is committed and watcher armed.
        entry.resolveReady?.();
    });

    // Schedule cleanup of the connection when the signal object is GC'd.
    cleanupSignalRegistry?.register(
        entry.signalObject,
        entry.connectionId,
        entry.signalObject
    );

    entry.ready = true;
};

// Handler for messages from wasm land.
const onWasmMessage = (event: MessageEvent<WasmMessage>) => {
    console.debug("[JsLand] onWasmMessage", event);
    const { diff, connectionId, type } = event.data;

    // Only process messages for objects we track.
    const entry = connectionIdToEntry.get(connectionId);
    if (!entry) return;

    // And only process messages that are addressed to js-land.
    if (type === "FrontendUpdate") return;
    if (type === "Request") return;
    if (type === "Stop") return;

    if (type === "InitialResponse") {
        setUpConnection(entry, event.data);
    } else if (type === "BackendUpdate" && diff) {
        applyDiff(entry.signalObject, diff);
    } else {
        console.warn("[JsLand] Unknown message type", event);
    }
};

const keyToEntry = new Map<string, PoolEntry<any>>();
const connectionIdToEntry = new Map<string, PoolEntry<any>>();

const communicationChannel = new BroadcastChannel("shape-manager");
communicationChannel.addEventListener("message", onWasmMessage);

// FinalizationRegistry to clean up connections when signal objects are GC'd.
const cleanupSignalRegistry =
    typeof FinalizationRegistry === "function"
        ? new FinalizationRegistry<string>((connectionId) => {
              // Best-effort fallback; look up by id and clean
              const entry = connectionIdToEntry.get(connectionId);
              if (!entry) return;
              entry.release();
          })
        : null;

export function createSignalObjectForShape<T extends OrmBase>(
    shapeType: ShapeType<T>,
    scope?: Scope
) {
    const scopeKey = canonicalScope(scope);

    // Unique identifier for a given shape type and scope.
    const key = `${shapeType.shape}::${scopeKey}`;

    // If we already have an object for this shape+scope, return it
    // and just increase the reference count.
    const existing = keyToEntry.get(key);
    if (existing) {
        existing.refCount++;
        return buildReturn(existing);
    }

    // Otherwise, create a new signal object and an entry for it.
    const signalObject = deepSignal<T | {}>({});

    const entry: PoolEntry<T> = {
        key,
        // The id for future communication between wasm and js land.
        connectionId: `${key}_${new Date().toISOString()}`,
        shapeType,
        scopeKey,
        signalObject,
        refCount: 1,
        suspendDeepWatcher: false,
        ready: false,
        // readyPromise will be set just below
        readyPromise: Promise.resolve(),
        resolveReady: () => {},
        // Function to manually release the connection.
        // Only releases if no more references exist.
        release: () => {
            if (entry.refCount > 0) entry.refCount--;
            if (entry.refCount === 0) {
                communicationChannel.postMessage({
                    type: "Stop",
                    connectionId: entry.connectionId,
                } as WasmMessage);

                keyToEntry.delete(entry.key);
                connectionIdToEntry.delete(entry.connectionId);

                // In your manual release
                cleanupSignalRegistry?.unregister(entry.signalObject);
            }
        },
    };

    // Initialize per-entry readiness promise that resolves in setUpConnection
    entry.readyPromise = new Promise<void>((resolve) => {
        entry.resolveReady = resolve;
    });

    keyToEntry.set(key, entry);
    connectionIdToEntry.set(entry.connectionId, entry);

    // TODO: Just a hack since the channel is not set up in mock-mode
    setTimeout(
        () =>
            communicationChannel.postMessage({
                type: "Request",
                connectionId: entry.connectionId,
                shapeType,
            } as WasmMessage),
        100
    );

    function buildReturn(entry: PoolEntry<T>) {
        return {
            signalObject: entry.signalObject,
            stop: entry.release,
            connectionId: entry.connectionId,
            readyPromise: entry.readyPromise,
        };
    }

    return buildReturn(entry);
}
