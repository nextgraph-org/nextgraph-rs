import type { QuadMatch } from "@ldo/rdf-utils";
import type { ProxyContext } from "../ProxyContext.js";
import type { RawObject, RawValue } from "../util/RawObject.js";
import type { ObjectSetProxyQuadMatch } from "./ObjectSetProxy.js";
import { ObjectSetProxy } from "./ObjectSetProxy.js";
import type { SubjectSetProxyQuadMatch } from "./SubjectSetProxy.js";
import { SubjectSetProxy } from "./SubjectSetProxy.js";
import type { WildcardObjectSetProxyQuadMatch } from "./WildcardObjectSetProxy.js";
import { WildcardObjectSetProxy } from "./WildcardObjectSetProxy.js";
import type { WildcardSubjectSetProxyQuadMatch } from "./WildcardSubjectSetProxy.js";
import { WildcardSubjectSetProxy } from "./WildcardSubjectSetProxy.js";
import type { SetProxy } from "./SetProxy.js";

export function createNewSetProxy<T extends NonNullable<RawValue>>(
  quadMatch: QuadMatch,
  isSubjectOriented: boolean,
  proxyContext: ProxyContext,
  isLangSet?: boolean,
): SetProxy<T> {
  if (!isSubjectOriented) {
    if (quadMatch[0] && quadMatch[1]) {
      return new ObjectSetProxy<T>(
        proxyContext,
        quadMatch as ObjectSetProxyQuadMatch,
        isLangSet,
      );
    } else {
      return new WildcardObjectSetProxy<T>(
        proxyContext,
        quadMatch as WildcardObjectSetProxyQuadMatch,
        isLangSet,
      );
    }
  } else {
    if (quadMatch[1] && quadMatch[2]) {
      return new SubjectSetProxy<T & RawObject>(
        proxyContext,
        quadMatch as SubjectSetProxyQuadMatch,
      );
    } else {
      return new WildcardSubjectSetProxy<T & RawObject>(
        proxyContext,
        quadMatch as WildcardSubjectSetProxyQuadMatch,
      );
    }
  }
}
