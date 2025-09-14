import { getSubjectProxyFromObject } from "../subjectProxy/isSubjectProxy.js";
import type { ObjectLike } from "../types.js";
import { _getUnderlyingNode, _proxyContext } from "../types.js";
import { getProxyFromObject } from "./isProxy.js";

export interface InteractOptions {
  /**
   * Given a dataset proxy, this will set the action on that dataset proxy
   * @param objects Any number of dataset proxies
   * @returns An end function. Call this if to reset the interaction
   */
  using(...objects: ObjectLike[]): () => void;
  /**
   * Given a dataset proxy this will copy the dataset proxy and set the action
   * on the copy
   * @param objects Any number of dataset proxies
   * @returns cloned dataset proxies
   */
  usingCopy<T extends ObjectLike>(...objects: T[]): T[];
}

export function createProxyInteractOptions(
  paramKey: string,
  parameter: unknown,
): InteractOptions {
  return {
    using(...objects: ObjectLike[]): () => void {
      const onEndFunctions: (() => void)[] = [];
      objects.forEach((object) => {
        const proxy = getProxyFromObject(object);
        const oldProxyContext = proxy[_proxyContext];
        proxy[_proxyContext] = proxy[_proxyContext].duplicate({
          [paramKey]: parameter,
        });
        onEndFunctions.push(() => {
          proxy[_proxyContext] = oldProxyContext;
        });
      });
      return function endWrite() {
        onEndFunctions.forEach((func) => func());
      };
    },
    usingCopy<T extends ObjectLike>(...objects: T[]): T[] {
      return objects.map((object) => {
        const proxy = getSubjectProxyFromObject(object);
        const newProxyContext = proxy[_proxyContext].duplicate({
          [paramKey]: parameter,
        });
        return newProxyContext.createSubjectProxy(
          proxy[_getUnderlyingNode],
        ) as unknown as T;
      });
    },
  };
}
