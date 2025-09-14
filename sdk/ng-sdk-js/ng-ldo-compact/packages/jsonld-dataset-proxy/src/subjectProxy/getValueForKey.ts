import type { SubjectProxyTarget } from "./createSubjectHandler.js";
import { namedNode } from "@ldo/rdf-utils";
import { nodeToJsonldRepresentation } from "../util/nodeToJsonldRepresentation.js";
import type { SubjectProxy } from "./SubjectProxy.js";
import type { SetProxy } from "../setProxy/SetProxy.js";
import type { ProxyContext } from "../ProxyContext.js";
import { filterQuadsByLanguageOrdering } from "../language/languageUtils.js";

/**
 * Given a subject target and a key return the correct value
 */
export function getValueForKey(
  target: SubjectProxyTarget,
  key: string | symbol,
  proxyContext: ProxyContext,
): SubjectProxy | SetProxy | string | number | boolean | undefined {
  const { contextUtil, dataset } = proxyContext;
  if (key === "@id") {
    if (target["@id"].termType === "BlankNode") {
      return undefined;
    }
    // Purposly don't provide a typeName because we don't want to use the nested
    // context
    return contextUtil.iriToKey(target["@id"].value, []);
  }
  if (key === "toString" || key === Symbol.toStringTag) {
    // TODO: this toString method right now returns [object Object],
    // which is correct, but it could be more descriptive, especially
    // because console.log doesn't return anyting helpful due to the proxy.
    return Reflect.get(target, "toString");
  }
  if (typeof key === "symbol") {
    return;
  }
  const subject = target["@id"];
  const rdfType = proxyContext.getRdfType(subject);
  const predicate = namedNode(contextUtil.keyToIri(key, rdfType));
  if (contextUtil.isSet(key, rdfType)) {
    const arrayProxy = proxyContext.createSetProxy(
      [subject, predicate, null, null],
      false,
      contextUtil.isLangString(key, rdfType),
    );
    return arrayProxy;
  }
  let objectDataset = dataset.match(subject, predicate);
  if (contextUtil.isLangString(key, rdfType)) {
    objectDataset = filterQuadsByLanguageOrdering(
      objectDataset,
      proxyContext.languageOrdering,
    );
  }
  if (objectDataset.size === 0) {
    return undefined;
  } else {
    const thing = nodeToJsonldRepresentation(
      objectDataset.toArray()[0].object,
      proxyContext,
    );
    return thing;
  }
}
