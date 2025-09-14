import { isSetProxy } from "../setProxy/isSetProxy.js";
import type { LdSet } from "../setProxy/ldSet/LdSet.js";
import type { SetProxy } from "../setProxy/SetProxy.js";
import { isSubjectProxy } from "../subjectProxy/isSubjectProxy.js";
import type { SubjectProxy } from "../subjectProxy/SubjectProxy.js";
import type { ObjectLike } from "../types.js";

export function isProxy(
  someObject?: unknown,
): someObject is SetProxy | SubjectProxy {
  return isSubjectProxy(someObject) || isSetProxy(someObject);
}

export function getProxyFromObject(
  object: ObjectLike | LdSet<ObjectLike>,
): SubjectProxy | SetProxy {
  if (!isProxy(object)) {
    throw new Error(`${object} is not a Jsonld Dataset Proxy`);
  }
  return object;
}
