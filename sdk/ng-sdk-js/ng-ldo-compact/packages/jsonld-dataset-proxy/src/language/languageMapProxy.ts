import type { PredicateNode, SubjectNode } from "@ldo/rdf-utils";
import { quad, literal } from "@ldo/rdf-utils";
import type { ProxyContext } from "../ProxyContext.js";
import {
  languageKeyToLiteralLanguage,
  quadsToLanguageQuadMap,
  languageDeleteMatch,
} from "./languageUtils.js";
import type { LanguageMap, LanguageSetMap } from "./languagesOf.js";
import LanguageSet from "./languageSet.js";

export function createLanguageMapProxy<
  Target extends LanguageMap | LanguageSetMap,
>(
  subject: SubjectNode,
  predicate: PredicateNode,
  proxyContext: ProxyContext,
  isArray: boolean,
): Target {
  const target: Target = {} as Target;
  // Function to call to update the target to represent what's in the dataset
  const targetSetter = (target: Target) => {
    // Clear the target
    Object.keys(target).forEach((key) => delete target[key]);
    // Add current language map to target
    const allQuads = proxyContext.dataset.match(subject, predicate);
    const languageQuadMap = quadsToLanguageQuadMap(allQuads);
    Object.entries(languageQuadMap).forEach(([language, quads]) => {
      const stringArray = quads.toArray().map((quad) => quad.object.value);
      if (isArray) {
        target[language] = new Set(stringArray);
      } else {
        target[language] = stringArray[0];
      }
    });
  };

  targetSetter(target);

  return new Proxy<Target>(target, {
    get: (target, key) => {
      targetSetter(target);
      if (typeof key !== "string") {
        return Reflect.get(target, key);
      }
      if (isArray) {
        return new LanguageSet(subject, predicate, key, proxyContext);
      }
      return Reflect.get(target, key);
    },
    set: (target, key, value) => {
      const language = languageKeyToLiteralLanguage(key);
      // Delete all quads with the language currently
      if (!isArray) {
        languageDeleteMatch(proxyContext.dataset, subject, predicate, language);
      }
      // Add the new quad for the language
      proxyContext.writeGraphs.forEach((writeGraph) => {
        proxyContext.dataset.add(
          quad(subject, predicate, literal(value, language), writeGraph),
        );
      });
      return Reflect.set(target, key, value);
    },
    deleteProperty: (target, key) => {
      languageDeleteMatch(
        proxyContext.dataset,
        subject,
        predicate,
        languageKeyToLiteralLanguage(key),
      );
      return Reflect.deleteProperty(target, key);
    },
  }) as Target;
}
