import { ref, onBeforeUnmount } from "vue";
import { watch } from "ng-alien-deepsignals";

/**
 * Bridge a deepSignal root into Vue with per top-level property granularity.
 * Each accessed property is a Ref internally; only patches touching that
 * property will trigger its dependents. Returned value is a plain object (not a Ref)
 * shaped like the original deepSignal root. Nested changes trigger the top-level
 * property whose subtree changed.
 */
export function useDeepSignal<T extends Record<string, any>>(deepProxy: T): T {
  // Version refs per top-level property; increment to trigger dependents.
  const versionRefs = new Map<
    string | symbol,
    ReturnType<typeof ref<number>>
  >();

  function ensureVersion(key: string | symbol) {
    if (!versionRefs.has(key)) versionRefs.set(key, ref(0));
    return versionRefs.get(key)!;
  }

  // Initialize known keys
  Object.keys(deepProxy).forEach((k) => ensureVersion(k));

  const stopHandle = watch(deepProxy, ({ patches }) => {
    for (const p of patches) {
      if (!p.path.length) continue;
      const top = p.path[0] as string | symbol;
      const vr = ensureVersion(top);
      vr.value = (vr.value || 0) + 1;
    }
  });

  const proxy = new Proxy({} as T, {
    get(_t, key: string | symbol) {
      if (key === "__raw") return deepProxy;
      // Establish dependency via version ref; ignore its numeric value.
      ensureVersion(key).value; // accessed for tracking only
      return (deepProxy as any)[key];
    },
    set(_t, key: string | symbol, value: any) {
      (deepProxy as any)[key] = value;
      // Bump version immediately for sync updates (before patch batch flush)
      const vr = ensureVersion(key);
      vr.value = (vr.value || 0) + 1;
      return true;
    },
    has(_t, key) {
      return key in deepProxy;
    },
    ownKeys() {
      return Reflect.ownKeys(deepProxy);
    },
    getOwnPropertyDescriptor() {
      return { configurable: true, enumerable: true };
    },
  });

  onBeforeUnmount(() => {
    stopHandle.stopListening();
    versionRefs.clear();
  });

  return proxy;
}

export default useDeepSignal;
