import { derived, writable, type Readable } from "svelte/store";
import { createSignalObjectForShape } from "../../connector/createSignalObjectForShape.js";
import type { Scope, Shape } from "../../types.js";
import { onDestroy } from "svelte";
import {
    subscribeDeepMutations,
    getDeepSignalRootId,
    type DeepPatch,
} from "@ng-org/alien-deepsignals";
import type { BaseType, ShapeType } from "@ng-org/shex-orm";

/** Base result contract for a deepSignal-backed Svelte integration. */
export interface UseDeepSignalResult<T = any> extends Readable<T> {
    /** Store of the full deep proxy tree (also accessible via `subscribe` directly on this result). */
    deep: Readable<T>;
    /** Last batch of deep mutation patches for this root (empties only on next non-empty batch). */
    patches: Readable<DeepPatch[]>;
    /** Derive a nested selection; re-runs when the underlying tree version increments. */
    select<U>(selector: (tree: T) => U): Readable<U>;
    /** Stop receiving further updates (invoked automatically on component destroy). */
    dispose(): void;
    /** Replace root shape contents (mutative merge) – enables Svelte writable store binding semantics. */
    set(next: Partial<T> | T): void;
    /** Functional update helper using current tree snapshot. */
    update(updater: (current: T) => T | void): void;
}

/**
 * Generic Svelte rune bridging any deepSignal proxy root into the Svelte store contract.
 *
 * Exposes itself as a store (has `subscribe`) plus helper properties/methods.
 */
export function useDeepSignal<T = any>(deepProxy: T): UseDeepSignalResult<T> {
    const rootId = getDeepSignalRootId(deepProxy as any);
    const version = writable(0);
    const patchesStore = writable<DeepPatch[]>([]);

    const unsubscribe = subscribeDeepMutations(
        deepProxy as any,
        (batch: DeepPatch[]) => {
            if (!rootId) return;
            if (batch.length) {
                patchesStore.set(batch);
                version.update((n) => n + 1);
            }
        }
    );

    const deep = derived(version, () => deepProxy);
    const select = <U>(selector: (tree: T) => U): Readable<U> =>
        derived(deep, (t) => selector(t));
    const dispose = () => unsubscribe();
    onDestroy(dispose);

    // Expose Svelte store contract by delegating subscribe to deep store.
    const applyReplacement = (next: any) => {
        if (!next || typeof next !== "object") return;
        // Remove keys absent in next
        for (const k of Object.keys(deepProxy as any)) {
            if (!(k in next)) delete (deepProxy as any)[k];
        }
        // Assign / overwrite provided keys
        Object.assign(deepProxy as any, next);
    };

    const store: UseDeepSignalResult<T> = {
        deep,
        patches: patchesStore,
        select,
        dispose,
        subscribe: deep.subscribe,
        set(next) {
            applyReplacement(next);
        },
        update(updater) {
            const result = updater(deepProxy);
            if (result && typeof result === "object") applyReplacement(result);
        },
    };
    return store;
}

/** Extended result including the originating root signal wrapper from shape logic. */
export interface UseShapeRuneResult<T = any> extends UseDeepSignalResult<T> {
    root: any;
}

/**
 * Shape-specific rune: constructs the signal object for a shape then delegates to {@link useDeepSignal}.
 */
export function useShapeRune<T extends BaseType>(
    shape: ShapeType<T>,
    scope?: Scope
): UseShapeRuneResult<T | {}> {
    const { signalObject: rootSignal, stop } = createSignalObjectForShape(
        shape,
        scope
    );

    // Cleanup
    onDestroy(stop);

    // rootSignal is already a deepSignal proxy root (object returned by createSignalObjectForShape)
    const ds = useDeepSignal<T>(rootSignal as T);
    return { root: rootSignal, ...ds } as UseShapeRuneResult<T>;
}

export default useShapeRune;
