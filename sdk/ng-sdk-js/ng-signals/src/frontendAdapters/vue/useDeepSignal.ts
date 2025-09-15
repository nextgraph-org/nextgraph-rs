import { ref, onBeforeUnmount } from "vue";
import { watch } from "@nextgraph-monorepo/ng-alien-deepsignals";

/**
 * Bridge a deepSignal root into Vue with per top-level property granularity.
 */
export function useDeepSignal<T extends Record<string | number | symbol, any>>(
    deepProxy: T
): T {
    // Version per top-level key
    const versionRefs = new Map<PropertyKey, ReturnType<typeof ref<number>>>();
    // Version for the set of top-level keys (enumeration/in-operator)
    const keysVersion = ref(0);

    const ensureVersion = (key: PropertyKey) => {
        if (!versionRefs.has(key)) versionRefs.set(key, ref(0));
        return versionRefs.get(key)!;
    };

    const bump = (key: PropertyKey) => {
        const vr = ensureVersion(key);
        vr.value = (vr.value || 0) + 1;
    };

    const bumpAllTopKeys = () => {
        for (const k of Reflect.ownKeys(deepProxy as object)) bump(k);
    };

    // Seed existing string keys (symbols will be created on demand)
    for (const k of Object.keys(deepProxy as object)) ensureVersion(k);

    // Normalize first path element to a JS property key compatible with Proxy traps
    const normalizeTopKey = (k: unknown): PropertyKey =>
        typeof k === "number" ? String(k) : (k as PropertyKey);

    // Subscribe to deep patches (coalesced per batch to avoid redundant triggers)
    const stopHandle = watch(deepProxy, ({ patches }) => {
        let sawRoot = false;
        let keysChanged = false;
        const touched = new Set<PropertyKey>();

        for (const p of patches) {
            if (!p || !Array.isArray(p.path)) continue;

            if (p.path.length === 0) {
                sawRoot = true;
                break; // full invalidation; no need to examine the rest
            }

            touched.add(normalizeTopKey(p.path[0]));

            const op = p.op as string | undefined;
            if (p.path.length === 1 && (op === "add" || op === "remove")) {
                keysChanged = true;
            }
        }

        if (sawRoot) {
            keysVersion.value++;
            bumpAllTopKeys();
            return;
        }

        if (keysChanged) keysVersion.value++;
        for (const k of touched) bump(k);
    });

    const proxy = new Proxy({} as T, {
        get(_t, key: PropertyKey) {
            if (key === "__raw") return deepProxy;
            // Track per-key dependence
            ensureVersion(key).value;
            return deepProxy[key];
        },
        set(_t, key: PropertyKey, value: any) {
            deepProxy[key] = value;
            return true;
        },
        deleteProperty(_t, key: PropertyKey) {
            return delete deepProxy[key];
        },
        has(_t, key: PropertyKey) {
            // Make `'foo' in proxy` reactive to key set changes
            keysVersion.value;
            return key in deepProxy;
        },
        ownKeys() {
            // Make Object.keys/for...in/v-for over keys reactive
            keysVersion.value;
            return Reflect.ownKeys(deepProxy as object);
        },
        getOwnPropertyDescriptor(_t, key: PropertyKey) {
            // Keep enumeration reactive; report a configurable, enumerable prop
            keysVersion.value;
            return { configurable: true, enumerable: true };
        },
    });

    onBeforeUnmount(() => {
        try {
            stopHandle.stopListening();
        } catch {
            // ignore
        }
        versionRefs.clear();
    });

    return proxy;
}

export default useDeepSignal;
