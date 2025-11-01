import {useEffect, useSyncExternalStore} from "react";
import {dataService} from "@/services/dataService";
import type {Contact} from "@/types/contact";

type Subscriber = () => void;

interface ContactSubjectEntry {
  target?: Contact;
  proxy?: Contact;
  subscribers: Set<Subscriber>;
  isLoading: boolean;
  error: string | null;
  loadPromise?: Promise<Contact | undefined>;
  revision: number;
  snapshot: ContactSnapshot;
}

interface ContactSnapshot {
  contact: Contact | undefined;
  isLoading: boolean;
  error: string | null;
  // Monotonic counter to signal updates even when proxy reference stays stable.
  revision: number;
}

const contactSubjects = new Map<string, ContactSubjectEntry>();
const proxyCache = new WeakMap<object, any>();
const proxyTargetLookup = new WeakMap<object, object>();
const nonConfigurablePropsCache = new WeakMap<object, Set<PropertyKey>>();

const mutatingMethodNames = new Set<string>([
  "add",
  "clear",
  "delete",
  "set",
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "copyWithin",
  "fill",
]);

const defaultSnapshot: ContactSnapshot = {
  contact: undefined,
  isLoading: false,
  error: null,
  revision: 0,
};

const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

const isPromise = (value: unknown): value is Promise<unknown> =>
  isObject(value) && typeof (value as any).then === "function";

const isDate = (value: unknown): value is Date => value instanceof Date;

const REACT_ELEMENT_TYPE = typeof Symbol === "function" && Symbol.for
  ? Symbol.for("react.element")
  : undefined;

const isReactElement = (value: any): boolean =>
  !!value &&
  typeof value === "object" &&
  REACT_ELEMENT_TYPE !== undefined &&
  value.$$typeof === REACT_ELEMENT_TYPE;

const shouldSkipProxy = (value: object): boolean =>
  value instanceof Map ||
  value instanceof Set ||
  value instanceof WeakMap ||
  value instanceof WeakSet ||
  value instanceof RegExp ||
  ArrayBuffer.isView(value) ||
  value instanceof ArrayBuffer ||
  isReactElement(value);

const unwrapValue = <T>(value: T): T => {
  if (!isObject(value)) {
    return value;
  }
  return (proxyTargetLookup.get(value as object) as T) ?? value;
};

const notify = (nuri: string) => {
  const entry = contactSubjects.get(nuri);
  if (!entry) return;
  if (entry.target) {
    entry.proxy = createReactiveProxy(entry.target, () => notify(nuri), true);
  }
  const nextRevision = entry.revision + 1;
  entry.revision = nextRevision;
  entry.snapshot = {
    contact: entry.proxy,
    isLoading: entry.isLoading,
    error: entry.error,
    revision: nextRevision,
  };
  entry.subscribers.forEach(listener => listener());
};

dataService.subscribeToContactUpdates((nuri, contact) => {
  const entry = contactSubjects.get(nuri);
  if (!entry) {
    return;
  }

  if (!contact) {
    entry.target = undefined;
    entry.proxy = undefined;
  } else {
    entry.target = unwrapValue(contact);
  }

  entry.isLoading = false;
  entry.error = null;
  notify(nuri);
});

const getOrCreateEntry = (nuri: string): ContactSubjectEntry => {
  let entry = contactSubjects.get(nuri);
  if (!entry) {
    entry = {
      subscribers: new Set<Subscriber>(),
      isLoading: false,
      error: null,
      revision: 0,
      snapshot: {
        contact: undefined,
        isLoading: false,
        error: null,
        revision: 0,
      },
    };
    contactSubjects.set(nuri, entry);
  }
  return entry;
};

const wrapResult = <T>(result: T, notifyChange: () => void): T => {
  if (!isObject(result) || isPromise(result) || isDate(result)) {
    return result;
  }
  if (shouldSkipProxy(result as object)) {
    return result;
  }
  if (proxyCache.has(result as object)) {
    return proxyCache.get(result as object);
  }
  if (proxyTargetLookup.has(result as object)) {
    return result;
  }
  return createReactiveProxy(result as object, notifyChange) as T;
};

const createReactiveProxy = <T extends object>(target: T, notifyChange: () => void, forceNew = false): T => {
  if (shouldSkipProxy(target)) {
    return target;
  }
  if (proxyTargetLookup.has(target as object)) {
    return target;
  }
  if (!forceNew && proxyCache.has(target)) {
    return proxyCache.get(target);
  }

  const proxy = new Proxy(target as Record<PropertyKey, any>, {
    get(targetObj, prop, receiver) {
      if (prop === "__isReactiveProxy__") {
        return true;
      }

       const propDescriptor = Reflect.getOwnPropertyDescriptor(targetObj, prop);
       if (propDescriptor && !propDescriptor.configurable && !propDescriptor.writable) {
         return Reflect.get(targetObj, prop, receiver);
       }

      const value = Reflect.get(targetObj, prop, receiver);

      if (typeof value === "function") {
        const propName = typeof prop === "string" ? prop : prop.toString();
        // Only wrap known mutating methods, don't wrap all functions
        // This prevents wrapping React components or other functions that shouldn't be proxied
        if (mutatingMethodNames.has(propName)) {
          const fn = value as (...args: any[]) => unknown;
          return function reactiveMethod(this: unknown, ...args: any[]) {
            const result = fn.apply(this === receiver ? targetObj : this, args);
            notifyChange();
            return wrapResult(result, notifyChange);
          };
        }
        // Return non-mutating functions unwrapped
        return value;
      }

      if (isObject(value) && !isDate(value)) {
        return createReactiveProxy(value as object, notifyChange);
      }

      return value;
    },
    set(targetObj, prop, newValue, receiver) {
      const cachedNonConfigurable = nonConfigurablePropsCache.get(targetObj);
      if (cachedNonConfigurable?.has(prop)) {
        return Reflect.set(targetObj, prop, newValue, receiver);
      }

      const propDescriptor = Reflect.getOwnPropertyDescriptor(targetObj, prop);
      if (propDescriptor && !propDescriptor.configurable) {
        if (!propDescriptor.writable) {
          return Reflect.set(targetObj, prop, newValue, receiver);
        }
        nonConfigurablePropsCache.set(targetObj, (cachedNonConfigurable ?? new Set<PropertyKey>()).add(prop));
      }

      const previous = Reflect.get(targetObj, prop, receiver);
      const normalizedPrevious = isObject(previous) ? unwrapValue(previous) : previous;

      let valueToAssign = newValue;
      let normalizedNext = newValue;

      if (isObject(newValue) && !isDate(newValue) && !isPromise(newValue)) {
        const rawValue = unwrapValue(newValue);
        normalizedNext = rawValue;
        valueToAssign = shouldSkipProxy(rawValue as object)
          ? rawValue
          : createReactiveProxy(rawValue as object, notifyChange);
      }

      const changed = !Object.is(normalizedPrevious, normalizedNext);
      const result = Reflect.set(targetObj, prop, valueToAssign, receiver);
      if (changed) {
        notifyChange();
      }
      return result;
    },
    deleteProperty(targetObj, prop) {
      const hadProperty = Reflect.has(targetObj, prop);
      const result = Reflect.deleteProperty(targetObj, prop);
      if (hadProperty && result) {
        notifyChange();
      }
      return result;
    },
  }) as T;

  proxyCache.set(target, proxy);
  proxyTargetLookup.set(proxy as object, target);
  return proxy;
};

const ensureContactLoaded = async (nuri: string, force = false): Promise<Contact | undefined> => {
  const entry = getOrCreateEntry(nuri);

  if (!force && entry.proxy) {
    return entry.proxy;
  }

  if (!force && entry.loadPromise) {
    return entry.loadPromise;
  }

  entry.isLoading = true;
  entry.error = null;
  notify(nuri);

  const loadPromise = dataService.getContact(nuri)
    .then(contact => {
      if (!contact) {
        entry.target = undefined;
        entry.proxy = undefined;
      } else {
        const rawContact = unwrapValue(contact);
        entry.target = rawContact;
        entry.proxy = createReactiveProxy(rawContact, () => notify(nuri), true);
      }
      entry.isLoading = false;
      entry.error = null;
      notify(nuri);
      return entry.proxy;
    })
    .catch(err => {
      entry.isLoading = false;
      entry.error = err instanceof Error ? err.message : String(err);
      notify(nuri);
      throw err;
    })
    .finally(() => {
      entry.loadPromise = undefined;
    });

  entry.loadPromise = loadPromise;
  return loadPromise;
};

const getSnapshot = (nuri: string | null): ContactSnapshot => {
  if (!nuri) {
    return defaultSnapshot;
  }
  const entry = contactSubjects.get(nuri);
  if (!entry) {
    return defaultSnapshot;
  }
  return entry.snapshot;
};

const subscribeToContact = (nuri: string, listener: Subscriber) => {
  const entry = getOrCreateEntry(nuri);
  entry.subscribers.add(listener);
  return () => {
    entry.subscribers.delete(listener);
  };
};

export const useMockContactSubject = (
  nuri: string | null,
  refreshKey = 0,
) => {
  const snapshot = useSyncExternalStore(
    listener => {
      if (!nuri) {
        return () => {};
      }
      return subscribeToContact(nuri, listener);
    },
    () => getSnapshot(nuri),
    () => getSnapshot(nuri),
  );

  useEffect(() => {
    if (!nuri) {
      return;
    }
    ensureContactLoaded(nuri, refreshKey > 0).catch(() => {});
  }, [nuri, refreshKey]);

 /* const setContact = useCallback<Dispatch<SetStateAction<Contact | undefined>>>(
    valueOrUpdater => {
      if (!nuri) {
        return;
      }

      const entry = getOrCreateEntry(nuri);
      const current = entry.proxy;
      const nextValue = typeof valueOrUpdater === "function"
        ? (valueOrUpdater as (prev: Contact | undefined) => Contact | undefined)(current)
        : valueOrUpdater;

      entry.error = null;

      if (!nextValue) {
        entry.target = undefined;
        entry.proxy = undefined;
        entry.isLoading = false;
        notify(nuri);
        return;
      }

      const rawNext = unwrapValue(nextValue);
      entry.target = rawNext;
      entry.proxy = createReactiveProxy(rawNext, () => notify(nuri), true);
      entry.isLoading = false;
      notify(nuri);
    },
    [nuri],
  );*/

/*  const reload = useCallback(() => {
    if (!nuri) {
      return;
    }
    ensureContactLoaded(nuri, true).catch(() => {});
  }, [nuri]);*/

  return snapshot.contact;
};
