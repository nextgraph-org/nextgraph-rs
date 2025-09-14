import type { SubjectProxyTarget } from "@ldo/jsonld-dataset-proxy";
import {
  createSubjectHandler,
  type SubjectProxy,
} from "@ldo/jsonld-dataset-proxy";
import type { BlankNode, NamedNode } from "@rdfjs/types";
import type { TrackingProxyContext } from "./TrackingProxyContext.js";
import { namedNode } from "@ldo/rdf-utils";

/**
 * @internal
 *
 * Creates a tracking proxy for a single value, a proxy that tracks the fields
 * that have been accessed.
 */
export function createTrackingSubjectProxy(
  proxyContext: TrackingProxyContext,
  node: NamedNode | BlankNode,
): SubjectProxy {
  const baseHandler = createSubjectHandler(proxyContext);
  const oldGetFunction = baseHandler.get;
  const trackingProxyGetFunction: ProxyHandler<SubjectProxyTarget>["get"] = (
    target: SubjectProxyTarget,
    key: string | symbol,
    receiver,
  ) => {
    const subject = target["@id"];
    const rdfTypes = proxyContext.getRdfType(subject);
    if (typeof key === "symbol") {
      // Do Nothing
    } else if (key === "@id") {
      proxyContext.addListener([subject, null, null, null]);
    } else if (!proxyContext.contextUtil.isSet(key, rdfTypes)) {
      const predicate = namedNode(
        proxyContext.contextUtil.keyToIri(key, rdfTypes),
      );
      proxyContext.addListener([subject, predicate, null, null]);
    }
    return oldGetFunction && oldGetFunction(target, key, receiver);
  };
  baseHandler.get = trackingProxyGetFunction;
  baseHandler.set = () => {
    console.warn(
      "You've attempted to set a value on a Linked Data Object from the useSubject, useMatchingSubject, or useMatchingObject hooks. These linked data objects should only be used to render data, not modify it. To modify data, use the `changeData` function.",
    );
    return true;
  };
  return new Proxy({ "@id": node }, baseHandler) as unknown as SubjectProxy;
}
