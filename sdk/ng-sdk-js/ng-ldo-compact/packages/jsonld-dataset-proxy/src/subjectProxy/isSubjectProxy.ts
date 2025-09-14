import type { ObjectLike } from "../types.js";
import {
  _getUnderlyingDataset,
  _getUnderlyingNode,
  _proxyContext,
  _writeGraphs,
} from "../types.js";
import type { SubjectProxy } from "./SubjectProxy.js";

export function isSubjectProxy(
  someObject?: unknown,
): someObject is SubjectProxy {
  if (!someObject) return false;
  if (typeof someObject !== "object") return false;
  const potentialSubjectProxy = someObject as SubjectProxy;
  return !(
    typeof potentialSubjectProxy[_writeGraphs] !== "object" ||
    typeof potentialSubjectProxy[_getUnderlyingDataset] !== "object" ||
    typeof potentialSubjectProxy[_getUnderlyingNode] !== "object" ||
    typeof potentialSubjectProxy[_proxyContext] !== "object"
  );
}

export function getSubjectProxyFromObject(object: ObjectLike): SubjectProxy {
  const potentialSubjectProxy = object as SubjectProxy;
  if (!isSubjectProxy(potentialSubjectProxy)) {
    throw new Error(`${object} is not a Jsonld Dataset Proxy Subject`);
  }
  return potentialSubjectProxy;
}
