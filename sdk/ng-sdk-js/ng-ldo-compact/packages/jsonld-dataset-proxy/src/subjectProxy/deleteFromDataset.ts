import type { SubjectProxyTarget } from "./createSubjectHandler.js";
import type { ProxyContext } from "../ProxyContext.js";
import { addObjectToDataset } from "../util/addObjectToDataset.js";

export function deleteValueFromDataset(
  target: SubjectProxyTarget,
  key: string | symbol,
  proxyContext: ProxyContext,
) {
  if (key === "@context") {
    return true;
  }
  if (key === "toString" || key === Symbol.toStringTag) {
    return true;
  }
  if (typeof key === "symbol") {
    return true;
  }
  // Remove this node completely if delete on ID
  if (key === "@id") {
    const thisNode = target["@id"];
    proxyContext.dataset.deleteMatches(thisNode, undefined, undefined);
    proxyContext.dataset.deleteMatches(undefined, undefined, thisNode);
    return true;
  }
  // Otherwise, this is essentially treated like setting a key to undefined.
  addObjectToDataset(
    { "@id": target["@id"], [key]: undefined },
    true,
    proxyContext,
  );
  return true;
}
