import type { JsonLdDocument } from "jsonld";
import type { GraphNode, DatasetChanges } from "@ldo/rdf-utils";
import type { InteractOptions } from "@ldo/jsonld-dataset-proxy";
import {
  getProxyFromObject,
  _getUnderlyingDataset,
  _proxyContext,
  write as writeDependency,
} from "@ldo/jsonld-dataset-proxy";
import type { SubscribableDataset } from "@ldo/subscribable-dataset";
import type { WriterOptions } from "@ldo/rdf-utils";
import type { Dataset, Quad } from "@rdfjs/types";
import { changesToSparqlUpdate, datasetToString } from "@ldo/rdf-utils";
import type { LdoBase } from "./util.js";
import {
  canDatasetStartTransaction,
  getTransactionalDatasetFromLdo,
  normalizeNodeNames,
} from "./util.js";

import {
  graphOf as graphOfImport,
  languagesOf as languagesOfImport,
  setLanguagePreferences as setLanguagePreferencesImport,
} from "@ldo/jsonld-dataset-proxy";

/**
 * The graph of specific information can be detected using the `graphOf(subject, predicate, object)` function.
 *
 * @param subject - A Linked Data Object that represents the subject of a quad.
 * @param predicate - A field on the given Linked Data Object
 * @param object - An optional parameter that represents the direct object of a statement. This could be a Linked Data Object or a number to indicate the location in an array. This argument can be left blank if the given field is not an array.
 *
 * @returns A GraphNode (defaultGraph or namedNode).
 *
 * @example
 * ```typescript
 * import { graphOf } from "@ldo/ldo";
 * graphOf(person, "name", 0); // returns defaultGraph()
 * graphOf(person, "age"); // returns defaultGraph()
 * ```
 */
export const graphOf = graphOfImport;

/**
 * The `languageOf` function lets you view and modify the language strings directly. `languageOf` takes two properties:
 *
 * It returns a mapping of languages to strings or sets of strings depending on the cardinality of the JSON-LD context.
 *
 * @param ldo - Any Linked Data Object
 * @param field - Any field on the provided Linked Data Object
 *
 * @returns `languageOf` returns either a `LanguageSetMap` if the given field is an array, or a `LanguageMap` if the given field is a singular value. For example, `languageOf(profile, "friends")` would return a `LanguageSetMap` because there the `listOfFriendNames` field has a cardinality over 1, but `languageOf(profile, "familyName")` would return a `LanguageMap` because it has a cardinality of 1.
 *
 * @example
 * This example uses a `LanguageMap`. The `LanguageMap` is a mapping between various language tags (including the `@none` tag) and the singular language value for that tag. Modifying the `LanguageMap` will automatically update the underlying dataset.
 * ```typescript
 * const labelLanguages = languagesOf(hospitalInfo, "label");
 * // labelLanguages: { '@none': 'Hospital', fr: 'Hôpital', ko: '병원' }
 * // logs "병원"
 * console.log(labelLanguages.ko);
 * // Adds a Chinese label
 * labelLanguages.zh = "医院";
 * // Changes the no-language label from to "Super Hospital"
 * labelLanguages["@none"] = "Super Hospital";
 * // Removes the French label
 * delete labelLanguages.fr;
 * ```
 * @example
 * This example uses a `LanguageSetMap` The `LanguageSetMap` is a mapping between various language tags (including the `@none` tag) and a JavaScript Set of all values for that tag. Modifying the `LanguageSetMap` will automatically update the underlying dataset.
 * ```typescript
 * const descriptionLanguages = languagesOf(hospitalInfo, "description");
 * // descriptionLanguages:
 * // {
 * //   '@none': Set(2) { 'Heals patients', 'Has doctors' },
 * //   fr: Set(2) { 'Guérit les malades', 'A des médecins' },
 * //   ko: Set(2) { '환자를 치료하다', '의사 있음' }
 * // }
 * // Logs: 환자를 치료하다\n의사 있음
 * Array.from(descriptionLanguages.ko).forEach((str) => console.log(str));
 * // Adds a Hindi description
 * descriptionLanguages.hi?.add("रोगियों को ठीक करता है");
 * // Checks to see if the korean label contains "의사 있음"
 * descriptionLanguages.ko?.has("의사 있음"); // returns true
 * // Removes "Has Doctors" from the no-language description
 * descriptionLanguages["@none"]?.delete("Has Doctors");
 * ```
 */
export const languagesOf = languagesOfImport;

/**
 * A language preference is an ordered list telling the Linked Data Object the language you prefer as well as callbacks.
 *
 * For read operations, the Linked Data Object will search for values in order of the preference. Write operations will choose the first language in the language preference, unless that language is `@other`, in which case it will choose the next language.
 *
 * @example
 * A language ordering is an ordering of preferred languages. Valid values for the language preferences includes any [IETF Language Tag](https://en.wikipedia.org/wiki/IETF_language_tag) as well as the special tags `@none` and `@other`. `@none` represents any language literal that doesn't have a language tag. `@other` represents any language literal that isn't listed among the language preferences.
 *
 * ```typescript
 * // Read Spansih first, then Korean, then language strings with no language
 * // New writes are in Spanish
 * ["es", "ko", "@none"]
 *
 * // Read any language other than french, then french
 * // New writes are in French
 * ["@other", "fr"]
 * ```
 *
 * @example
 * The `setLanguagePreferences(...).using(...)` function sets the language preferences for a set of Linked Data Objects.
 *
 * ```typescript
 * import { setLanguagePreferences } from "@ldo/ldo";
 *
 * setLanguagePreferences("fr", "ko").using(hospitalInfo);
 * console.log(hospitalInfo.label); // Logs "Hôpital"
 * setLanguagePreferences("@none").using(hospitalInfo);
 * console.log(hospitalInfo.label); // Logs "Hospital"
 * ```
 *
 * @example
 * The `setLanguagePreferences(...).usingCopy(...)` function returns a copy of the provided Linked Data Objects with the given language preferences.
 *
 * ```typescript
 * import { setLanguagePreferences } from "@ldo/ldo";
 *
 * // ...
 *
 * const [frenchPreference] = setLanguagePreferences("fr").usingCopy(hospitalInfo);
 * const [koreanPreference] = setLanguagePreferences("ko").usingCopy(hospitalInfo);
 * console.log(frenchPreference.label); // Logs "Hôpital"
 * console.log(koreanPreference.label); // Logs "병원"
 * ```
 */
export const setLanguagePreferences = setLanguagePreferencesImport;

/**
 * By default, all new quads are added to the default graph, but you can change the graph to which new quads are added using the `write` function.
 *
 * @example
 * The `write(...).using(...)` function lets you define the graphs you wish to write to using specific jsonldDatasetProxies.
 *
 * ```typescript
 * import { write } from "@ldo/ldo";
 *
 * // Now all additions with person1 will be on ExampleGraph1
 * write(namedNode("http://example.com/ExampleGraph1")).using(person1);
 * person1.name.push("Jack");
 * // Now all additions with person1 will be on ExampleGraph2
 * write(namedNode("http://example.com/ExampleGraph2")).using(person1);
 * person1.name.push("Spicer");
 *
 * console.log(dataset.toString());
 * // Logs:
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "Jack" <http://example.com/ExampleGraph1> .
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "Spicer" <http://example.com/ExampleGraph2> .
 * ```
 *
 * The function also returns an `end` function that will reset the graph to what it was before. This is useful for nesting graph modifications.
 *
 * ```typescript
 * person1.name.push("default");
 * const end1 = write(namedNode("http://example.com/Graph1")).using(person1);
 * person1.name.push("1");
 * const end2 = write(namedNode("http://example.com/Graph2")).using(person1);
 * person1.name.push("2");
 * const end3 = write(namedNode("http://example.com/Graph3")).using(person1);
 * person1.name.push("3");
 * end3();
 * person1.name.push("2 again");
 * end2();
 * person1.name.push("1 again");
 * end1();
 * person1.name.push("default again");
 * console.log(dataset.toString());
 * // Logs:
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "default" .
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "default again" .
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "1" <http://example.com/Graph1> .
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "1 again" <http://example.com/Graph1> .
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "2" <http://example.com/Graph2> .
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "2 again" <http://example.com/Graph2> .
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "3" <http://example.com/Graph3> .
 * ```
 * @example
 * If you would like a new variable to write to without modifying the original Jsonld Dataset Proxy, you can use `write(...).usingCopy(...)`.
 *
 * ```typescript
 * const [person1WritingToNewGraph] = write(
 *   namedNode("http://example.com/NewGraph")
 * ).usingCopy(person1);
 * person1WritingToNewGraph.name.push("Brandon");
 * person1.name.push("Sanderson");
 * console.log(dataset.toString());
 * // Logs:
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "Brandon" <http://example.com/NewGraph> .
 * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "Sanderson" .
 * ```
 */
export function write(...graphs: (GraphNode | string)[]): InteractOptions {
  return writeDependency(...normalizeNodeNames(graphs));
}

/**
 * Begins a transaction for a Linked Data Object. After this function is run, the Linked Data Object is considered to be "transactable" where all modifications are not written to the underlying dataset are stored separately as a delta.
 *
 * Note: If a Linked Data Object is "transactable", it cannot be passed into `startTransaction` a second time.
 *
 * @param ldo - Any linked data object that is not currently "transactable"
 *
 * @example
 * ```typescript
 * import {
 *   startTransaction,
 *   transactionChanges,
 *   toSparqlUpdate,
 *   commitTransaction,
 * } from "@ldo/ldo";
 *
 * // ... Get the profile linked data object
 *
 * startTransaction(profile);
 * profile.name = "Kuzon"
 * const changes = transactionChanges(profile));
 * // Logs: <https://example.com/aang> <http://xmlns.com/foaf/0.1/name> "Kuzon"
 * console.log(changes.added?.toString())
 * // Logs: <https://example.com/aang> <http://xmlns.com/foaf/0.1/name> "Aang"
 * console.log(changes.removed?.toString())
 * commitTransaction(profile);
 * ```
 */
export function startTransaction(ldo: LdoBase): void {
  const proxy = getProxyFromObject(ldo);
  const dataset = proxy[_getUnderlyingDataset];
  if (!canDatasetStartTransaction(dataset)) {
    throw new Error("Object is not transactable.");
  }
  proxy[_proxyContext] = proxy[_proxyContext].duplicate({
    dataset: (dataset as SubscribableDataset<Quad>).startTransaction(),
    state: { parentDataset: dataset },
  });
}

/**
 * Commits a transaction, writing all the stored changes to the underlying dataset. After this function is run, the Linked Data Object is considered to be NOT "transactable" all further modifications will be written directly to the underlying dataset.
 *
 * @param ldo - Any linked data object that is currently "transactable"
 *
 * @example
 * ```typescript
 * import {
 *   startTransaction,
 *   transactionChanges,
 *   toSparqlUpdate,
 *   commitTransaction,
 * } from "@ldo/ldo";
 *
 * // ... Get the profile linked data object
 *
 * startTransaction(profile);
 * profile.name = "Kuzon"
 * const changes = transactionChanges(profile));
 * // Logs: <https://example.com/aang> <http://xmlns.com/foaf/0.1/name> "Kuzon"
 * console.log(changes.added?.toString())
 * // Logs: <https://example.com/aang> <http://xmlns.com/foaf/0.1/name> "Aang"
 * console.log(changes.removed?.toString())
 * commitTransaction(profile);
 * ```
 */
export function commitTransaction(ldo: LdoBase): void {
  const [dataset, proxy] = getTransactionalDatasetFromLdo(ldo);
  dataset.commit();
  proxy[_proxyContext] = proxy[_proxyContext].duplicate({
    dataset: proxy[_proxyContext].state
      .parentDataset as SubscribableDataset<Quad>,
  });
}

/**
 * Returns the changes that are made on a "transactable" Linked Data Object.
 *
 * @param ldo - Any linked data object that is currently "transactable"
 *
 * @returns Dataset changes with all quads added during this transaction and all quads removed during this transaction
 *
 * @example
 * ```typescript
 * import {
 *   startTransaction,
 *   transactionChanges,
 *   toSparqlUpdate,
 *   commitTransaction,
 * } from "@ldo/ldo";
 *
 * // ... Get the profile linked data object
 *
 * startTransaction(profile);
 * profile.name = "Kuzon"
 * const changes = transactionChanges(profile));
 * // Logs: <https://example.com/aang> <http://xmlns.com/foaf/0.1/name> "Kuzon"
 * console.log(changes.added?.toString())
 * // Logs: <https://example.com/aang> <http://xmlns.com/foaf/0.1/name> "Aang"
 * console.log(changes.removed?.toString())
 * commitTransaction(profile);
 * ```
 */
export function transactionChanges(ldo: LdoBase): DatasetChanges<Quad> {
  const [dataset] = getTransactionalDatasetFromLdo(ldo);
  return dataset.getChanges();
}

/**
 * Returns the Linked Data Object's underlying RDFJS dataset. Modifying this dataset will change the Linked Data Object as well.
 *
 * @param ldo - The Linked Data Object from which the RDFJS dataset should be extracted.
 *
 * @returns An RDFJS dataset
 *
 * @example
 * ```typescript
 * import { getDataset } from "@ldo/ldo"
 * const dataset = getDataset(profile);
 * ```
 */
export function getDataset(ldo: LdoBase): Dataset {
  const proxy = getProxyFromObject(ldo);
  return proxy[_getUnderlyingDataset];
}

/**
 * Converts a "transactable" Linked Data Object (A Linked Data Object that has been passed as a parameter to the `startTransaction` function) to a SPARQL/Update string.
 *
 * @param ldo - Any linked data object that is currently "transactable"
 *
 * @returns A SPARQL Update string
 */
export async function toSparqlUpdate(ldo: LdoBase): Promise<string> {
  const [dataset] = getTransactionalDatasetFromLdo(ldo);
  const changes = dataset.getChanges();
  return changesToSparqlUpdate(changes);
}

/**
 * Converts a Linked Data Object to a string representation based on a provided configuration.
 *
 * @param ldo - Any linked data object
 * @param options - WriterOptions from N3
 * @param options.format - `string | MimeFormat | undefined` The name of the format to serialize.
 * @param options.prefixes - `Prefixes<RDF.NamedNode | string> | - undefined` A list of prefixes that should be in the document.
 *
 * @returns Serialized N3 RDF
 *
 * @example
 * ```typescript
 * import { serialize } from "@ldo/ldo"
 * // ...
 * const rawTurtle: string = await serialize(profile, {
 *   format: "Turtle",
 *   prefixes: {
 *     ex: "https://example.com/",
 *     foaf: "http://xmlns.com/foaf/0.1/",
 *   }
 * });
 * ```
 */
export async function serialize(
  ldo: LdoBase,
  options: WriterOptions,
): Promise<string> {
  const dataset = getProxyFromObject(ldo)[_getUnderlyingDataset];
  return datasetToString(dataset, options);
}

/**
 * Converts a Linked Data Object to a Turtle string
 *
 * @param ldo - Any linked data object
 * @returns Serialized Turtle
 *
 * @example
 * ```typescript
 * import { toTurtle } from "@ldo/ldo"
 * // ...
 * const rawTurtle: string = await toTurtle(profile);
 * ```
 */
export async function toTurtle(ldo: LdoBase): Promise<string> {
  const dataset = getProxyFromObject(ldo)[_getUnderlyingDataset];
  return datasetToString(dataset, {});
}

export async function toJsonLd(_ldo: LdoBase): Promise<JsonLdDocument> {
  throw new Error("Not Implemented");
}

/**
 * Converts a Linked Data Object to a NTriples string
 *
 * @param ldo - Any linked data object
 * @returns An N-Triple string
 *
 * @example
 * ```typescript
 * import { toNTriples } from "@ldo/ldo"
 * // ...
 * const rawNTriples: string = await toNTriples(profile);
 * ```
 */
export async function toNTriples(ldo: LdoBase): Promise<string> {
  const dataset = getProxyFromObject(ldo)[_getUnderlyingDataset];
  return datasetToString(dataset, { format: "N-Triples" });
}
