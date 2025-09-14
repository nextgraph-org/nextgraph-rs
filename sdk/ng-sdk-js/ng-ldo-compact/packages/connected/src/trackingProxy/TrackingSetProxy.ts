import { createNewSetProxy, type SetProxy } from "@ldo/jsonld-dataset-proxy";
import type { TrackingProxyContext } from "./TrackingProxyContext.js";
import type { QuadMatch } from "@ldo/rdf-utils";

/**
 * @internal
 *
 * Creates a tracking proxy for a set, a proxy that tracks the fields that have
 * been accessed.
 */
export function createTrackingSetProxy(
  proxyContext: TrackingProxyContext,
  quadMatch: QuadMatch,
  isSubjectOriented?: boolean,
  isLangStringSet?: boolean,
): SetProxy {
  const baseSetProxy = createNewSetProxy(
    quadMatch,
    isSubjectOriented ?? false,
    proxyContext,
    isLangStringSet,
  );

  return new Proxy(baseSetProxy, {
    get: (target: SetProxy, key: string | symbol, receiver) => {
      if (trackingMethods.has(key)) {
        proxyContext.addListener(quadMatch);
      } else if (disallowedMethods.has(key)) {
        console.warn(
          "You've attempted to modify a value on a Linked Data Object from the useSubject, useMatchingSubject, or useMatchingObject hooks. These linked data objects should only be used to render data, not modify it. To modify data, use the `changeData` function.",
        );
      }
      return Reflect.get(target, key, receiver);
    },
  });
}

const trackingMethods = new Set([
  "has",
  "size",
  "entries",
  "keys",
  "values",
  Symbol.iterator,
  "every",
  "every",
  "some",
  "forEach",
  "map",
  "reduce",
  "toArray",
  "toJSON",
  "difference",
  "intersection",
  "isDisjointFrom",
  "isSubsetOf",
  "isSupersetOf",
  "symmetricDifference",
  "union",
]);

const disallowedMethods = new Set<string | symbol>(["add", "clear", "delete"]);
