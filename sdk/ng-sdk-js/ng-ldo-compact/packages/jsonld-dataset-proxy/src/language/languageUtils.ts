import type { Dataset, Literal, Quad, Quad_Object } from "@rdfjs/types";
import type { ObjectNode, PredicateNode, SubjectNode } from "@ldo/rdf-utils";
import { createDataset } from "@ldo/dataset";
import type { LanguageKey, LanguageOrdering } from "./languageTypes.js";

/**
 *
 * @param dataset
 * @param subject
 * @param predicate
 * @param languageKey
 * @returns
 */
export function languageMatch(
  dataset: Dataset,
  subject: ObjectNode,
  predicate: PredicateNode,
  languageKey: LanguageKey,
): Dataset<LiteralObjectQuad> {
  const literalLanguage = languageKeyToLiteralLanguage(languageKey);
  return dataset.match(subject, predicate).filter((quad) => {
    return (
      isLanguageLiteral(quad.object) && quad.object.language === literalLanguage
    );
  }) as Dataset<LiteralObjectQuad>;
}

/**
 *
 * @param dataset
 * @param subject
 * @param predicate
 * @param languageKey
 */
export function languageDeleteMatch(
  dataset: Dataset,
  subject: SubjectNode,
  predicate: PredicateNode,
  languageKey: LanguageKey,
): void {
  const quadsToDelete = languageMatch(dataset, subject, predicate, languageKey);
  quadsToDelete.forEach((quad) => {
    dataset.delete(quad);
  });
}

/**
 * Given a node, will return true if that node is a literal that could have a
 * language. This does not guarantee that it is a language literal.
 * @param node the node to test
 * @returns boolean
 */
export function isLanguageLiteral(node: Quad_Object): node is Literal {
  return (
    node.termType === "Literal" &&
    (node.datatype.value ===
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString" ||
      node.datatype.value === "http://www.w3.org/2001/XMLSchema#string")
  );
}

export interface LiteralObjectQuad extends Quad {
  object: Literal;
}

export function quadsToLanguageQuadMap(
  quads: Dataset,
): Record<LanguageKey, Dataset<LiteralObjectQuad>> {
  const languageQuadMap: Record<LanguageKey, Dataset<LiteralObjectQuad>> = {};
  quads.forEach((quad) => {
    const literal = quad.object;
    if (isLanguageLiteral(literal)) {
      const languageKey = literalLanguageToLanguageKey(literal.language);
      if (!languageQuadMap[languageKey]) {
        languageQuadMap[languageKey] =
          createDataset() as Dataset<LiteralObjectQuad>;
      }
      languageQuadMap[languageKey].add(quad as LiteralObjectQuad);
    }
  });
  return languageQuadMap;
}

export function filterQuadsByLanguageOrdering(
  quads: Dataset,
  languageOrdering: LanguageOrdering,
): Dataset {
  const languageQuadMap = quadsToLanguageQuadMap(quads);
  const validLanguages = new Set(languageOrdering);
  const presentLanguages = new Set(Object.keys(languageQuadMap));
  for (const currentLanguageKey of languageOrdering) {
    if (presentLanguages.has(currentLanguageKey)) {
      return languageQuadMap[currentLanguageKey];
    }
    if (currentLanguageKey === "@other") {
      for (const presentLang of presentLanguages) {
        if (!validLanguages.has(presentLang)) {
          return languageQuadMap[presentLang];
        }
      }
    }
  }
  return createDataset();
}

export function getLanguageKeyForWriteOperation(
  languageOrdering: LanguageOrdering,
): LanguageKey | undefined {
  return languageOrdering.find((lang) => lang !== "@other");
}

// function addToDatasetMap(
//   key: string,
//   value: Quad,
//   map: Record<string, Dataset>
// ) {
//   if (!map[key]) {
//     map[key] = createDataset();
//   }
//   map[key].add(value);
// }

// export function filterDatasetByLanguageOrdering(
//   dataset: Dataset,
//   proxyContext: ProxyContext
// ): Dataset {
//   // TODO: This is an O(n) task that could be reduced to O(1) if we cached some
//   // of the processing
//   const validLangs = new Set(proxyContext.languageOrdering);
//   const sortedLangs: Record<string, Dataset> = {};
//   dataset.forEach((quad) => {
//     const literal = quad.object;
//     if (isLangStringNode(literal)) {
//       if (literal.language === "") {
//         addToDatasetMap("@none", quad, sortedLangs);
//       } else if (validLangs.has(literal.language)) {
//         addToDatasetMap(literal.language, quad, sortedLangs);
//       } else {
//         addToDatasetMap("@other", quad, sortedLangs);
//       }
//     }
//   });
//   for (const language of proxyContext.languageOrdering) {
//     if (sortedLangs[language]) {
//       return sortedLangs[language];
//     }
//   }
//   return createDataset();
// }

export function languageKeyToLiteralLanguage(
  languageKey: string | symbol,
): string {
  return (languageKey === "@none" ? "" : languageKey) as string;
}

export function literalLanguageToLanguageKey(literalLanguage: string): string {
  return literalLanguage === "" ? "@none" : literalLanguage;
}
