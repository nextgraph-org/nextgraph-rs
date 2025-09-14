import type { BlankNode, NamedNode } from "@rdfjs/types";
import { namedNode, literal, quad } from "@ldo/rdf-utils";
import { _getUnderlyingNode } from "../types.js";
import type { SubjectProxy } from "../subjectProxy/SubjectProxy.js";
import { getNodeFromRawObject, getNodeFromRawValue } from "./getNodeFromRaw.js";
import type { RawObject, RawValue } from "./RawObject.js";
import type { ProxyContext } from "../ProxyContext.js";
import { isSubjectProxy } from "../subjectProxy/isSubjectProxy.js";
import { NodeSet } from "./NodeSet.js";
import {
  getLanguageKeyForWriteOperation,
  languageDeleteMatch,
  languageKeyToLiteralLanguage,
} from "../language/languageUtils.js";
import { BasicLdSet } from "../setProxy/ldSet/BasicLdSet.js";

export function addRawValueToDatasetRecursive(
  subject: NamedNode | BlankNode,
  key: string,
  value: RawValue,
  visitedObjects: NodeSet,
  shouldDeleteOldTriples: boolean,
  proxyContext: ProxyContext,
): void {
  const { dataset, contextUtil } = proxyContext;
  const rdfType = proxyContext.getRdfType(subject);
  const predicate = namedNode(contextUtil.keyToIri(key, rdfType));
  // Get the Object Node
  const object = getNodeFromRawValue(
    value,
    proxyContext,
    contextUtil.getDataType(key, rdfType),
  );
  if (object == undefined) {
    dataset.deleteMatches(subject, predicate);
  } else if (object.termType === "Literal") {
    let languageAppliedObject = object;
    // Handle language use case
    if (contextUtil.isLangString(key, rdfType)) {
      const languageKey = getLanguageKeyForWriteOperation(
        proxyContext.languageOrdering,
      );
      if (!languageKey) return;
      languageAppliedObject = literal(
        object.value,
        languageKeyToLiteralLanguage(languageKey),
      );
    }
    proxyContext.writeGraphs.forEach((graph) => {
      proxyContext.dataset.add(
        quad(subject, predicate, languageAppliedObject, graph),
      );
    });
  } else {
    // Delete any triples if the id is the same
    // if (!visitedObjects.has(object) && !isSubjectProxy(value)) {
    //   console.log("deleting 2", object.value);
    //   dataset.deleteMatches(object, undefined, undefined);
    // }
    proxyContext.writeGraphs.forEach((graph) => {
      dataset.add(quad(subject, predicate, object, graph));
    });
    if (!isSubjectProxy(value)) {
      const updateData: RawObject = (
        typeof value === "object"
          ? { ...value, "@id": object }
          : { "@id": object }
      ) as RawObject;
      addRawObjectToDatasetRecursive(
        updateData,
        visitedObjects,
        shouldDeleteOldTriples,
        proxyContext,
      );
    }
  }
}

export function addRawObjectToDatasetRecursive(
  item: RawObject,
  visitedObjects: NodeSet,
  shouldDeleteOldTriples: boolean,
  proxyContext: ProxyContext,
): SubjectProxy {
  const { dataset } = proxyContext;
  const subject = getNodeFromRawObject(item, proxyContext.contextUtil);
  const rdfType = proxyContext.getRdfType(subject);
  if (visitedObjects.has(subject)) {
    return proxyContext.createSubjectProxy(subject);
  }
  visitedObjects.add(subject);
  Object.entries(item).forEach(([key, value]) => {
    if (key === "@id") {
      return;
    }
    const predicate = namedNode(
      proxyContext.contextUtil.keyToIri(key, rdfType),
    );
    if (shouldDeleteOldTriples) {
      if (proxyContext.contextUtil.isLangString(key, rdfType)) {
        const languageKey = getLanguageKeyForWriteOperation(
          proxyContext.languageOrdering,
        );
        if (languageKey) {
          languageDeleteMatch(dataset, subject, predicate, languageKey);
        }
      } else {
        dataset.deleteMatches(subject, predicate);
      }
    }
    if (value instanceof BasicLdSet) {
      value.forEach((valueItem) => {
        addRawValueToDatasetRecursive(
          subject,
          key,
          valueItem,
          visitedObjects,
          true,
          proxyContext,
        );
      });
    } else {
      addRawValueToDatasetRecursive(
        subject,
        key,
        value as RawValue,
        visitedObjects,
        true,
        proxyContext,
      );
    }
  });
  return proxyContext.createSubjectProxy(subject);
}

export function addObjectToDataset(
  item: RawObject,
  shouldDeleteOldTriples: boolean,
  proxyContext: ProxyContext,
): SubjectProxy {
  return addRawObjectToDatasetRecursive(
    item,
    new NodeSet(),
    shouldDeleteOldTriples,
    proxyContext,
  );
}
