import { ReactiveFlags } from "./contents";
import { computed, signal, isSignal } from "./core";
/**
 * deepSignal: wrap an object / array / Set graph in lazy per-property signals plus an optional deep patch stream.
 *  - `$prop` returns a signal; plain prop returns its current value.
 *  - Getter props become computed signals.
 *  - Arrays expose `$` (index signals) & `$length`; Sets emit structural entry patches with synthetic ids.
 *  - subscribeDeepMutations(root, cb) batches set/delete ops per microtask (DeepPatch[]).
 *  - shallow(obj) skips deep proxying of a subtree.
 */

/** A batched deep mutation (set/add/remove) from a deepSignal root. */
export type DeepPatch = {
  /** Unique identifier for the deep signal root which produced this patch. */
  root: symbol;
  /** Property path (array indices, object keys, synthetic Set entry ids) from the root to the mutated location. */
  path: (string | number)[];
} & (
  | DeepSetAddPatch
  | DeepSetRemovePatch
  | DeepObjectAddPatch
  | DeepRemovePatch
  | DeepLiteralAddPatch
);
export interface DeepSetAddPatch {
  /** Mutation kind applied at the resolved `path`. */
  op: "add";
  type: "set";
  /** New value for `set` mutations (omitted for `delete`). */
  value: (number | string | boolean)[] | { [id: string]: object };
}
export interface DeepSetRemovePatch {
  /** Mutation kind applied at the resolved `path`. */
  op: "remove";
  type: "set";
  /** The value to be removed from the set. Either a literal or the key (id) of an object. */
  value: string | number | boolean;
}
export interface DeepObjectAddPatch {
  /** Mutation kind applied at the resolved `path`. */
  op: "add";
  type: "object";
}

export interface DeepRemovePatch {
  /** Mutation kind applied at the resolved `path`. */
  op: "remove";
}
export interface DeepLiteralAddPatch {
  /** Mutation kind applied at the resolved `path` */
  op: "add";
  /** The literal value to be added at the resolved `path` */
  value: string | number | boolean;
}

/** Callback signature for subscribeDeepMutations. */
export type DeepPatchSubscriber = (patches: DeepPatch[]) => void;

/** Minimal per-proxy metadata for path reconstruction. */
interface ProxyMeta {
  /** Parent proxy in the object graph (undefined for root). */
  parent?: object;
  /** Key within the parent pointing to this proxy (undefined for root). */
  key?: string | number;
  /** Stable root id symbol shared by the entire deepSignal tree. */
  root: symbol;
}

// Proxy -> metadata
const proxyMeta = new WeakMap<object, ProxyMeta>();
// Root symbol -> subscribers
const mutationSubscribers = new Map<symbol, Set<DeepPatchSubscriber>>();
// Pending patches grouped per root (flushed once per microtask)
let pendingPatches: Map<symbol, DeepPatch[]> | null = null;
let microtaskScheduled = false;

/** Sentinel symbol; get concrete root id via getDeepSignalRootId(proxy). */
export const DEEP_SIGNAL_ROOT_ID = Symbol("alienDeepSignalRootId");

function buildPath(
  startProxy: object,
  leafKey: string | number
): (string | number)[] {
  const path: (string | number)[] = [leafKey];
  let cur: object | undefined = startProxy;
  while (cur) {
    const meta = proxyMeta.get(cur);
    if (!meta) break; // Defensive: metadata should always exist.
    if (meta.key === undefined) break; // Reached root (no key recorded).
    path.unshift(meta.key);
    cur = meta.parent;
  }
  return path;
}

function queuePatch(patch: DeepPatch) {
  if (!pendingPatches) pendingPatches = new Map();
  const root = patch.root;
  let list = pendingPatches.get(root);
  if (!list) {
    list = [];
    pendingPatches.set(root, list);
  }
  list.push(patch);
  if (!microtaskScheduled) {
    microtaskScheduled = true;
    queueMicrotask(() => {
      microtaskScheduled = false;
      const groups = pendingPatches;
      pendingPatches = null;
      if (!groups) return;
      for (const [rootId, patches] of groups) {
        if (!patches.length) continue;
        const subs = mutationSubscribers.get(rootId);
        if (subs) subs.forEach((cb) => cb(patches));
      }
    });
  }
}

/** Subscribe to microtask-batched deep patches for a root (returns unsubscribe). */
export function subscribeDeepMutations(
  root: object | symbol,
  sub: DeepPatchSubscriber
): () => void {
  const rootId = typeof root === "symbol" ? root : getDeepSignalRootId(root);
  if (!rootId)
    throw new Error(
      "subscribeDeepMutations() expects a deepSignal root proxy or root id symbol"
    );
  let set = mutationSubscribers.get(rootId);
  if (!set) {
    set = new Set();
    mutationSubscribers.set(rootId, set);
  }
  set.add(sub);
  return () => {
    const bucket = mutationSubscribers.get(rootId);
    if (!bucket) return;
    bucket.delete(sub);
    if (bucket.size === 0) mutationSubscribers.delete(rootId);
  };
}

/** Return the stable root symbol for any deepSignal proxy (undefined if not one). */
export function getDeepSignalRootId(obj: any): symbol | undefined {
  return proxyMeta.get(obj)?.root;
}

// Proxy -> Map of property name -> signal function
/** Proxy -> Map<propertyName, signalFn> (lazy). */
const proxyToSignals = new WeakMap();
// Raw object/array/Set -> stable proxy
const objToProxy = new WeakMap();
// Raw array -> `$` meta proxy with index signals
const arrayToArrayOfSignals = new WeakMap();
// Objects already proxied or marked shallow
const ignore = new WeakSet();
// Object -> signal counter for enumeration invalidation
const objToIterable = new WeakMap();
const rg = /^\$/;
const descriptor = Object.getOwnPropertyDescriptor;
let peeking = false;

// Deep array interface refining callback parameter types.
type DeepArray<T> = Array<T> & {
  map: <U>(
    callbackfn: (
      value: DeepSignal<T>,
      index: number,
      array: DeepSignalArray<T[]>
    ) => U,
    thisArg?: any
  ) => U[];
  forEach: (
    callbackfn: (
      value: DeepSignal<T>,
      index: number,
      array: DeepSignalArray<T[]>
    ) => void,
    thisArg?: any
  ) => void;
  concat(...items: ConcatArray<T>[]): DeepSignalArray<T[]>;
  concat(...items: (T | ConcatArray<T>)[]): DeepSignalArray<T[]>;
  reverse(): DeepSignalArray<T[]>;
  shift(): DeepSignal<T> | undefined;
  slice(start?: number, end?: number): DeepSignalArray<T[]>;
  splice(start: number, deleteCount?: number): DeepSignalArray<T[]>;
  splice(
    start: number,
    deleteCount: number,
    ...items: T[]
  ): DeepSignalArray<T[]>;
  filter<S extends T>(
    predicate: (
      value: DeepSignal<T>,
      index: number,
      array: DeepSignalArray<T[]>
    ) => value is DeepSignal<S>,
    thisArg?: any
  ): DeepSignalArray<S[]>;
  filter(
    predicate: (
      value: DeepSignal<T>,
      index: number,
      array: DeepSignalArray<T[]>
    ) => unknown,
    thisArg?: any
  ): DeepSignalArray<T[]>;
  reduce(
    callbackfn: (
      previousValue: DeepSignal<T>,
      currentValue: DeepSignal<T>,
      currentIndex: number,
      array: DeepSignalArray<T[]>
    ) => T
  ): DeepSignal<T>;
  reduce(
    callbackfn: (
      previousValue: DeepSignal<T>,
      currentValue: DeepSignal<T>,
      currentIndex: number,
      array: DeepSignalArray<T[]>
    ) => DeepSignal<T>,
    initialValue: T
  ): DeepSignal<T>;
  reduce<U>(
    callbackfn: (
      previousValue: U,
      currentValue: DeepSignal<T>,
      currentIndex: number,
      array: DeepSignalArray<T[]>
    ) => U,
    initialValue: U
  ): U;
  reduceRight(
    callbackfn: (
      previousValue: DeepSignal<T>,
      currentValue: DeepSignal<T>,
      currentIndex: number,
      array: DeepSignalArray<T[]>
    ) => T
  ): DeepSignal<T>;
  reduceRight(
    callbackfn: (
      previousValue: DeepSignal<T>,
      currentValue: DeepSignal<T>,
      currentIndex: number,
      array: DeepSignalArray<T[]>
    ) => DeepSignal<T>,
    initialValue: T
  ): DeepSignal<T>;
  reduceRight<U>(
    callbackfn: (
      previousValue: U,
      currentValue: DeepSignal<T>,
      currentIndex: number,
      array: DeepSignalArray<T[]>
    ) => U,
    initialValue: U
  ): U;
};
// Synthetic ids for Set entry objects (stable key for patches)
let __blankNodeCounter = 0;
const setObjectIds = new WeakMap<object, string>();
const assignBlankNodeId = (obj: any) => {
  if (setObjectIds.has(obj)) return setObjectIds.get(obj)!;
  const id = `_b${++__blankNodeCounter}`;
  setObjectIds.set(obj, id);
  return id;
};
/** Assign (or override) synthetic id before Set.add(). */
export function setSetEntrySyntheticId(obj: object, id: string | number) {
  setObjectIds.set(obj, String(id));
}
const getSetEntryKey = (val: any): string | number => {
  if (val && typeof val === "object") {
    if (setObjectIds.has(val)) return setObjectIds.get(val)!;
    if (
      typeof (val as any).id === "string" ||
      typeof (val as any).id === "number"
    )
      return (val as any).id;
    if (
      typeof (val as any)["@id"] === "string" ||
      typeof (val as any)["@id"] === "number"
    )
      return (val as any)["@id"];
    return assignBlankNodeId(val);
  }
  return val as any;
};
/** Add entry with synthetic id; returns proxied object if applicable. */
export function addWithId<T extends object>(
  set: Set<T>,
  entry: T,
  id: string | number
): DeepSignal<T>;
export function addWithId<T>(set: Set<T>, entry: T, id: string | number): T;
export function addWithId(set: Set<any>, entry: any, id: string | number) {
  if (entry && typeof entry === "object") setSetEntrySyntheticId(entry, id);
  (set as any).add(entry);
  if (entry && typeof entry === "object" && objToProxy.has(entry))
    return objToProxy.get(entry);
  return entry;
}

/** Is value a deepSignal-managed proxy? */
export const isDeepSignal = (source: any) => {
  return proxyToSignals.has(source);
};

/** Was value explicitly marked shallow? */
export const isShallow = (source: any) => {
  return ignore.has(source);
};

/** Create (or reuse) a deep reactive proxy for an object / array / Set. */
export const deepSignal = <T extends object>(obj: T): DeepSignal<T> => {
  if (!shouldProxy(obj)) throw new Error("This object can't be observed.");
  if (!objToProxy.has(obj)) {
    // Create a unique root id symbol to identify this deep signal tree in patches.
    const rootId = Symbol("deepSignalRoot");
    const proxy = createProxy(obj, objectHandlers, rootId) as DeepSignal<T>;
    const meta = proxyMeta.get(proxy)!;
    meta.parent = undefined; // root has no parent
    meta.key = undefined; // root not addressed by a key
    meta.root = rootId; // ensure root id stored (explicit)
    // Pre-register an empty signals map so isDeepSignal() is true before any property access.
    if (!proxyToSignals.has(proxy)) proxyToSignals.set(proxy, new Map());
    objToProxy.set(obj, proxy);
  }
  return objToProxy.get(obj);
};

/** Read property without tracking (untracked read). */
export const peek = <
  T extends DeepSignalObject<object>,
  K extends keyof RevertDeepSignalObject<T>
>(
  obj: T,
  key: K
): RevertDeepSignal<RevertDeepSignalObject<T>[K]> => {
  peeking = true;
  const value = obj[key];
  try {
    peeking = false;
  } catch (e) {}
  return value as RevertDeepSignal<RevertDeepSignalObject<T>[K]>;
};

const shallowFlag = Symbol(ReactiveFlags.IS_SHALLOW);
/** Mark object to skip deep proxying (only reference changes tracked). */
export function shallow<T extends object>(obj: T): Shallow<T> {
  ignore.add(obj);
  return obj as Shallow<T>;
}

const createProxy = (
  target: object,
  handlers: ProxyHandler<object>,
  rootId?: symbol
) => {
  const proxy = new Proxy(target, handlers);
  ignore.add(proxy);
  // Initialize proxy metadata if not present. Root proxies provide a stable root id.
  if (!proxyMeta.has(proxy)) {
    proxyMeta.set(proxy, { root: rootId || Symbol("deepSignalDetachedRoot") });
  }
  return proxy;
};

// Set-specific access & structural patch emission.
function getFromSet(
  raw: Set<any>,
  key: string | symbol,
  receiver: object
): any {
  const meta = proxyMeta.get(receiver);
  // Helper to proxy a single entry (object) & assign synthetic id if needed.
  const ensureEntryProxy = (entry: any) => {
    if (
      entry &&
      typeof entry === "object" &&
      shouldProxy(entry) &&
      !objToProxy.has(entry)
    ) {
      const synthetic = getSetEntryKey(entry);
      const childProxy = createProxy(entry, objectHandlers, meta!.root);
      const childMeta = proxyMeta.get(childProxy)!;
      childMeta.parent = receiver;
      childMeta.key = synthetic;
      objToProxy.set(entry, childProxy);
      return childProxy;
    }
    if (objToProxy.has(entry)) return objToProxy.get(entry);
    return entry;
  };
  // Pre-pass to ensure any existing non-proxied object entries are proxied (enables deep patches after iteration)
  if (meta) raw.forEach(ensureEntryProxy);
  if (key === "add" || key === "delete" || key === "clear") {
    const fn: Function = (raw as any)[key];
    return function (this: any, ...args: any[]) {
      const sizeBefore = raw.size;
      const result = fn.apply(raw, args);
      if (raw.size !== sizeBefore) {
        const metaNow = proxyMeta.get(receiver);
        if (
          metaNow &&
          metaNow.parent !== undefined &&
          metaNow.key !== undefined
        ) {
          const containerPath = buildPath(metaNow.parent, metaNow.key);
          if (key === "add") {
            const entry = args[0];
            let synthetic = getSetEntryKey(entry);
            if (entry && typeof entry === "object") {
              for (const existing of raw.values()) {
                if (existing === entry) continue;
                if (getSetEntryKey(existing) === synthetic) {
                  synthetic = assignBlankNodeId(entry);
                  break;
                }
              }
            }
            let entryVal = entry;
            if (
              entryVal &&
              typeof entryVal === "object" &&
              shouldProxy(entryVal) &&
              !objToProxy.has(entryVal)
            ) {
              const childProxy = createProxy(
                entryVal,
                objectHandlers,
                metaNow.root
              );
              const childMeta = proxyMeta.get(childProxy)!;
              childMeta.parent = receiver;
              childMeta.key = synthetic;
              objToProxy.set(entryVal, childProxy);
              entryVal = childProxy;
            }
            // Set entry add: emit object vs literal variant.
            if (entryVal && typeof entryVal === "object") {
              queuePatch({
                root: metaNow.root,
                path: [...containerPath, synthetic],
                op: "add",
                type: "object",
              });
            } else {
              queuePatch({
                root: metaNow.root,
                path: [...containerPath, synthetic],
                op: "add",
                value: entryVal,
              });
            }
          } else if (key === "delete") {
            const entry = args[0];
            const synthetic = getSetEntryKey(entry);
            queuePatch({
              root: metaNow.root,
              path: [...containerPath, synthetic],
              op: "remove",
            });
          } else if (key === "clear") {
            // Structural clear: remove prior entry-level patches for this Set this tick.
            if (pendingPatches) {
              const group = pendingPatches.get(metaNow.root);
              if (group && group.length) {
                for (let i = group.length - 1; i >= 0; i--) {
                  const p = group[i];
                  if (
                    p.path.length === containerPath.length + 1 &&
                    containerPath.every((seg, idx) => p.path[idx] === seg)
                  ) {
                    group.splice(i, 1);
                  }
                }
              }
            }
            queuePatch({
              root: metaNow.root,
              path: containerPath,
              op: "add",
              type: "set",
              value: [],
            });
          }
        }
      }
      return result;
    };
  }
  const makeIterator = (pair: boolean) => {
    return function thisIter(this: any) {
      const iterable = raw.values();
      return {
        [Symbol.iterator]() {
          return {
            next() {
              const n = iterable.next();
              if (n.done) return n;
              const entry = ensureEntryProxy(n.value);
              return { value: pair ? [entry, entry] : entry, done: false };
            },
          };
        },
      } as Iterable<any>;
    };
  };
  if (key === "values" || key === "keys") return makeIterator(false);
  if (key === "entries") return makeIterator(true);
  if (key === "forEach") {
    return function thisForEach(this: any, cb: any, thisArg?: any) {
      raw.forEach((entry: any) => {
        cb.call(thisArg, ensureEntryProxy(entry), ensureEntryProxy(entry), raw);
      });
    };
  }
  // Properly handle native iteration (for..of, Array.from, spread) by binding to the raw Set.
  if (key === Symbol.iterator) {
    // Return a function whose `this` is the raw Set (avoids brand check failure on the proxy).
    return function (this: any) {
      // Use raw.values() so we can still ensure child entries are proxied lazily.
      const iterable = raw.values();
      return {
        [Symbol.iterator]() {
          return this;
        },
        next() {
          const n = iterable.next();
          if (n.done) return n;
          const entry = ensureEntryProxy(n.value);
          return { value: entry, done: false };
        },
      } as Iterator<any>;
    };
  }
  if (key === Symbol.iterator.toString()) {
    // string form access of iterator symbol; pass through (rare path)
  }
  const val = (raw as any)[key];
  if (typeof val === "function") return val.bind(raw);
  return val;
}

const throwOnMutation = () => {
  throw new Error(
    "Don't mutate the signals directly (use the underlying property/value instead)."
  );
};

// Does target define a getter for key?
function hasGetter(target: any, key: any) {
  return typeof descriptor(target, key)?.get === "function";
}

// Lazily allocate / fetch signal map for a proxy receiver.
function getSignals(receiver: object) {
  if (!proxyToSignals.has(receiver)) proxyToSignals.set(receiver, new Map());
  return proxyToSignals.get(receiver)!;
}

// Wrap & link child object/array/Set if needed.
function ensureChildProxy(value: any, parent: object, key: string | number) {
  if (!shouldProxy(value)) return value;
  if (!objToProxy.has(value)) {
    const parentMeta = proxyMeta.get(parent)!;
    const childProxy = createProxy(value, objectHandlers, parentMeta.root);
    const childMeta = proxyMeta.get(childProxy)!;
    childMeta.parent = parent;
    childMeta.key = key as string;
    objToProxy.set(value, childProxy);
  }
  return objToProxy.get(value);
}

// Normalize raw property key (handles $-prefix & array meta) -> { key, returnSignal }
function normalizeKey(
  target: any,
  fullKey: string,
  isArrayMeta: boolean,
  receiver: object
) {
  let returnSignal = isArrayMeta || fullKey[0] === "$";
  if (!isArrayMeta && Array.isArray(target) && returnSignal) {
    if (fullKey === "$") {
      // Provide $ meta proxy for array index signals
      if (!arrayToArrayOfSignals.has(target)) {
        arrayToArrayOfSignals.set(
          target,
          createProxy(target, arrayHandlers, proxyMeta.get(receiver)?.root)
        );
      }
      return { shortCircuit: arrayToArrayOfSignals.get(target) };
    }
    returnSignal = fullKey === "$length";
  }
  const key = returnSignal ? fullKey.replace(rg, "") : fullKey;
  return { key, returnSignal } as any;
}

// Create computed signal for getter property if needed.
function ensureComputed(
  signals: Map<any, any>,
  target: any,
  key: any,
  receiver: any
) {
  if (!signals.has(key) && hasGetter(target, key)) {
    signals.set(
      key,
      computed(() => Reflect.get(target, key, receiver))
    );
  }
}

// Unified get trap factory (object / array meta variant)
const get =
  (isArrayMeta: boolean) =>
  (target: object, fullKey: string, receiver: object): unknown => {
    if (peeking) return Reflect.get(target, fullKey, receiver);
    // Set handling delegated completely.
    if (target instanceof Set) {
      return getFromSet(target as Set<any>, fullKey as any, receiver);
    }
    const norm = normalizeKey(target, fullKey, isArrayMeta, receiver);
    if ((norm as any).shortCircuit) return (norm as any).shortCircuit; // returned meta proxy
    const { key, returnSignal } = norm as {
      key: string;
      returnSignal: boolean;
    };
    // Symbol fast-path
    if (typeof key === "symbol" && wellKnownSymbols.has(key))
      return Reflect.get(target, key, receiver);
    const signals = getSignals(receiver);
    ensureComputed(signals, target, key, receiver);
    if (!signals.has(key)) {
      let value = Reflect.get(target, key, receiver);
      if (returnSignal && typeof value === "function") return; // user asked for signal wrapper of function => ignore
      value = ensureChildProxy(value, receiver, key);
      signals.set(key, signal(value));
    }
    const sig = signals.get(key);
    return returnSignal ? sig : sig();
  };

// Standard object / array handlers
const objectHandlers = {
  get: get(false),
  set(target: object, fullKey: string, val: any, receiver: object): boolean {
    // Respect original getter/setter semantics
    if (typeof descriptor(target, fullKey)?.set === "function")
      return Reflect.set(target, fullKey, val, receiver);
    if (!proxyToSignals.has(receiver)) proxyToSignals.set(receiver, new Map());
    const signals = proxyToSignals.get(receiver);
    if (fullKey[0] === "$") {
      if (!isSignal(val)) throwOnMutation();
      const key = fullKey.replace(rg, "");
      signals.set(key, val);
      return Reflect.set(target, key, val.peek(), receiver);
    } else {
      let internal = val;
      if (shouldProxy(val)) {
        if (!objToProxy.has(val)) {
          // Link newly wrapped child to its parent for path reconstruction.
          // In some edge cases parent metadata might not yet be initialized (e.g.,
          // if a proxied structure was reconstructed in a way that bypassed the
          // original deepSignal root path). Fall back to creating/assigning it.
          let parentMeta = proxyMeta.get(receiver);
          if (!parentMeta) {
            // Assign a root id (new symbol) so downstream patches remain groupable.
            const created: ProxyMeta = {
              root: Symbol("deepSignalRootAuto"),
            } as ProxyMeta;
            proxyMeta.set(receiver, created);
            parentMeta = created;
          }
          const childProxy = createProxy(val, objectHandlers, parentMeta!.root);
          const childMeta = proxyMeta.get(childProxy)!;
          childMeta.parent = receiver;
          childMeta.key = fullKey;
          objToProxy.set(val, childProxy);
        }
        internal = objToProxy.get(val);
      }
      const isNew = !(fullKey in target);
      const result = Reflect.set(target, fullKey, val, receiver);

      if (!signals.has(fullKey)) {
        // First write after structure change -> create signal.
        signals.set(fullKey, signal(internal));
      } else {
        // Subsequent writes -> update underlying signal.
        signals.get(fullKey).set(internal);
      }
      if (isNew && objToIterable.has(target)) objToIterable.get(target).value++;
      if (Array.isArray(target) && signals.has("length"))
        signals.get("length").set(target.length);
      // Emit patch (after mutation) so subscribers get final value snapshot.
      const meta = proxyMeta.get(receiver);
      if (meta) {
        // Object/Array/Set assignment at property path.
        if (val && typeof val === "object") {
          queuePatch({
            root: meta.root,
            path: buildPath(receiver, fullKey),
            op: "add",
            type: "object",
          });
        } else {
          queuePatch({
            root: meta.root,
            path: buildPath(receiver, fullKey),
            op: "add",
            value: val,
          });
        }
      }
      return result;
    }
  },
  deleteProperty(target: object, key: string): boolean {
    if (key[0] === "$") throwOnMutation();
    const signals = proxyToSignals.get(objToProxy.get(target));
    const result = Reflect.deleteProperty(target, key);
    if (signals && signals.has(key)) signals.get(key).value = undefined;
    objToIterable.has(target) && objToIterable.get(target).value++;
    // Emit deletion patch
    const receiverProxy = objToProxy.get(target);
    const meta = receiverProxy && proxyMeta.get(receiverProxy);
    if (meta) {
      queuePatch({
        root: meta.root,
        path: buildPath(receiverProxy, key),
        op: "remove",
      });
    }
    return result;
  },
  ownKeys(target: object): (string | symbol)[] {
    if (!objToIterable.has(target)) objToIterable.set(target, signal(0));
    (objToIterable as any)._ = objToIterable.get(target).get();
    return Reflect.ownKeys(target);
  },
};

// Array `$` meta proxy handlers (index signals only)
const arrayHandlers = {
  get: get(true),
  set: throwOnMutation,
  deleteProperty: throwOnMutation,
};

const wellKnownSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map((key) => Symbol[key as WellKnownSymbols])
    .filter((value) => typeof value === "symbol")
);
// Supported constructors (Map intentionally excluded for now)
const supported = new Set([Object, Array, Set]);
const shouldProxy = (val: any): boolean => {
  if (typeof val !== "object" || val === null) return false;
  return supported.has(val.constructor) && !ignore.has(val);
};

/** TYPES **/ // Structural deep reactive view of an input type.
export type DeepSignal<T> = T extends Function
  ? T
  : T extends { [shallowFlag]: true }
  ? T
  : T extends Array<unknown>
  ? DeepSignalArray<T>
  : T extends object
  ? DeepSignalObject<T>
  : T;

/** Recursive mapped type converting an object graph into its deepSignal proxy shape. */
export type DeepSignalObject<T extends object> = {
  [P in keyof T & string as `$${P}`]?: T[P] extends Function
    ? never
    : ReturnType<typeof signal<T[P]>>;
} & {
  [P in keyof T]: DeepSignal<T[P]>;
};

/** Extract element type from an array. */
type ArrayType<T> = T extends Array<infer I> ? I : T;
/** DeepSignal-enhanced array type (numeric indices & `$` meta accessors). */
type DeepSignalArray<T> = DeepArray<ArrayType<T>> & {
  [key: number]: DeepSignal<ArrayType<T>>;
  $?: { [key: number]: ReturnType<typeof signal<ArrayType<T>>> };
  $length?: ReturnType<typeof signal<number>>;
};

/** Marker utility type for objects passed through without deep proxying. */
export type Shallow<T extends object> = T & { [shallowFlag]: true };

/** Framework adapter hook returning a DeepSignal proxy. */
export declare const useDeepSignal: <T extends object>(obj: T) => DeepSignal<T>;
// @ts-ignore
// Strip `$`-prefixed synthetic signal accessors from key union.
type FilterSignals<K> = K extends `$${string}` ? never : K;
/** Reverse of DeepSignalObject: remove signal accessors to obtain original object shape. */
type RevertDeepSignalObject<T> = Pick<T, FilterSignals<keyof T>>;
/** Reverse of DeepSignalArray: omit meta accessors. */
type RevertDeepSignalArray<T> = Omit<T, "$" | "$length">;

/** Inverse mapped type removing deepSignal wrapper affordances. */
export type RevertDeepSignal<T> = T extends Array<unknown>
  ? RevertDeepSignalArray<T>
  : T extends object
  ? RevertDeepSignalObject<T>
  : T;

/** Subset of ECMAScript well-known symbols we explicitly pass through without proxy wrapping. */
type WellKnownSymbols =
  | "asyncIterator"
  | "hasInstance"
  | "isConcatSpreadable"
  | "iterator"
  | "match"
  | "matchAll"
  | "replace"
  | "search"
  | "species"
  | "split"
  | "toPrimitive"
  | "toStringTag"
  | "unscopables";
