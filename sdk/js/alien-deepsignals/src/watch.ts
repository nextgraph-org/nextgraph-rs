import { isObject, isPlainObject, isSet, isMap, isArray } from "./utils";
import { isSignal } from "./core";
import {
    isDeepSignal,
    subscribeDeepMutations,
    getDeepSignalRootId,
    DeepPatch,
} from "./deepSignal";
import { ReactiveFlags } from "./contents";

/** Function provided to register a disposer (runs before next callback or on stop). */
export type RegisterCleanup = (cleanupFn: () => void) => void;
/** Signature for watchEffect style sources receiving the cleanup registrar. */
export type WatchEffect = (registerCleanup: RegisterCleanup) => void;

/** Options for {@link watch}. */
export interface WatchOptions {
    /** Trigger the callback immediately with the current value (default: false). */
    immediate?: boolean;
    /** Auto-stop the watcher after the first callback run that delivers patches (or immediate call if no patches). */
    once?: boolean;
    /** Allow legacy/unknown options (ignored) to avoid hard breaks while migrating. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [legacy: string]: any;
}

export interface WatchPatchEvent<Root = any> {
    /** Patch batch that triggered this callback (may be empty for immediate). */
    patches: DeepPatch[];
    /** Previous snapshot (deep-cloned) of the root value before these patches. Undefined on first call. */
    oldValue: Root | undefined;
    /** Current root value (live proxy). */
    newValue: Root;
}

export type WatchPatchCallback<Root = any> = (
    event: WatchPatchEvent<Root>
) => any;

// Internal helper kept for external compatibility.
export const remove = <T>(arr: T[], el: T): void => {
    const i = arr.indexOf(el);
    if (i > -1) arr.splice(i, 1);
};

/** Observe patch batches on a deep signal root. */
export function watch<Root = any>(
    source: Root,
    callback: WatchPatchCallback<Root>,
    options: WatchOptions = {}
) {
    if (!isDeepSignal(source)) {
        throw new Error(
            "watch() now only supports deepSignal roots (patch mode only)"
        );
    }
    const { immediate, once } = options;

    const rootId = getDeepSignalRootId(source as any)!;

    let active = true;
    let cleanup: (() => void) | undefined;
    const registerCleanup: RegisterCleanup = (fn) => {
        cleanup = fn;
    };
    const runCleanup = () => {
        if (cleanup) {
            try {
                cleanup();
            } catch {
                /* ignore */
            } finally {
                cleanup = undefined;
            }
        }
    };

    // Deep clone snapshot helper (JSON clone sufficient for typical reactive plain data)
    const clone = (v: any) => {
        try {
            return JSON.parse(JSON.stringify(v));
        } catch {
            return undefined as any;
        }
    };
    let lastSnapshot: Root | undefined = clone(source);

    const stopListening = () => {
        if (!active) return;
        active = false;
        runCleanup();
        unsubscribe && unsubscribe();
    };

    const deliver = (patches: DeepPatch[]) => {
        if (!active) return;
        runCleanup();
        const prev = lastSnapshot;
        const next = source as any as Root; // live proxy
        try {
            callback({
                patches,
                oldValue: prev,
                newValue: next,
            });
        } finally {
            if (active) lastSnapshot = clone(next);
            if (once) stopListening();
        }
    };

    const unsubscribe = subscribeDeepMutations(rootId, (patches) => {
        if (!patches.length) return; // ignore empty batches
        deliver(patches);
    });

    if (immediate) {
        // Immediate call with empty patch list (snapshot only)
        deliver([]);
    }

    return {
        /** Stop listening to future patch batches; idempotent. */
        stopListening,
        /** Register a cleanup callback run before the next invocation / stop. */
        registerCleanup,
    };
}

// observe alias
export function observe(
    source: any,
    cb: WatchPatchCallback,
    options?: WatchOptions
) {
    return watch(source, cb, options);
}

// Instrumentation counter for performance tests (number of traverse invocations)
/** Instrumentation counter tracking total `traverse()` invocations (used in tests). */
export let __traverseCount = 0; // retained for external tooling/tests although watch no longer uses traversal
/** Reset the traversal instrumentation counter back to 0. */
export function __resetTraverseCount() {
    __traverseCount = 0;
}

/**
 * Recursively touch (read) nested properties/entries/values of a reactive structure for dependency collection.
 * Depth-limited; protects against cycles via `seen` set; respects ReactiveFlags.SKIP opt-out.
 */
export function traverse(
    value: unknown,
    depth: number = Infinity,
    seen?: Set<unknown>
): unknown {
    __traverseCount++;
    if (depth <= 0 || !isObject(value) || (value as any)[ReactiveFlags.SKIP]) {
        return value;
    }

    seen = seen || new Set();
    if (seen.has(value)) {
        return value;
    }
    seen.add(value);
    depth--;
    if (isSignal(value)) {
        traverse((value as any)(), depth, seen);
    } else if (isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            traverse(value[i], depth, seen);
        }
    } else if (isSet(value) || isMap(value)) {
        value.forEach((v: any) => {
            traverse(v, depth, seen);
        });
    } else if (isPlainObject(value)) {
        for (const key in value) {
            traverse(value[key], depth, seen);
        }
        for (const key of Object.getOwnPropertySymbols(value)) {
            if (Object.prototype.propertyIsEnumerable.call(value, key)) {
                traverse(value[key as any], depth, seen);
            }
        }
    }
    return value;
}
