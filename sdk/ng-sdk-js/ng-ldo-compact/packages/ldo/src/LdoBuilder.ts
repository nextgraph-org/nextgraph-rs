import type { GraphNode, QuadMatch, SubjectNode } from "@ldo/rdf-utils";
import type {
  LanguageOrdering,
  JsonldDatasetProxyBuilder,
  LdSet,
} from "@ldo/jsonld-dataset-proxy";
import type { ShapeType, CompactShapeType, AnyShapeType } from "./ShapeType.js";
import type { LdoBase } from "./util.js";
import { normalizeNodeName, normalizeNodeNames } from "./util.js";

/**
 * An LdoBuilder contains utility methods for building a Linked Data Object for a certain type.
 *
 * It is not recommended to instantiate an LdoDataset. Instead use the {@link createLdoDataset} function.
 *
 * @typeParam Type - The TypeScript type of the eventual Linked Data Object.
 *
 * @example
 * ```typescript
 * import { LdoDataset, createLdoDatasetFactory } from "@ldo/ldo";
 * import { FoafProfileShapeType } from "./.ldo/foafProfile.shapeTypes.js";
 *
 * const ldoDataset = createLdoDataset();
 * const ldoBuilder = ldoDataset.usingType(FoafProfileShapeType);
 * const profile = ldoBuilder
 *   .write("https://example.com/someGraph")
 *   .fromSubject("https://example.com/profile#me");
 * ```
 */
export class LdoBuilder<Type extends LdoBase> {
  /**
   * @internal
   */
  protected jsonldDatasetProxyBuilder: JsonldDatasetProxyBuilder;
  protected shapeType: ShapeType<Type> | CompactShapeType<Type>;

  /**
   * Initializes the LdoBuilder
   *
   * @param jsonldDatasetProxyBuilder - A base JsonldDatasetProxyBuilder that thios LdoBuilder wraps
   * @param shapeType - The ShapeType for this builder
   */
  constructor(
    jsonldDatasetProxyBuilder: JsonldDatasetProxyBuilder,
    shapeType: AnyShapeType<Type>,
  ) {
    this.jsonldDatasetProxyBuilder = jsonldDatasetProxyBuilder;
    this.shapeType = shapeType;
  }

  /**
   * `fromSubject` lets you define a an `entryNode`, the place of entry for the graph. The object returned by `jsonldDatasetProxy` will represent the given node. This parameter accepts both `namedNode`s and `blankNode`s. `fromSubject` takes a generic type representing the typescript type of the given subject.
   *
   * @param subject - The node to match
   *
   * @returns A Linked Data Object for the provided subject.
   *
   * @example
   * ```typescript
   * const profile = ldoDataset
   *   .usingType(FoafProfileShapeType)
   *   .fromSubject("http://example.com/Person1");
   * ```
   */
  fromSubject(subject: SubjectNode | string): Type {
    return this.jsonldDatasetProxyBuilder.fromSubject<Type>(
      normalizeNodeName(subject),
    );
  }

  /**
   * `matchSubject` returns a Jsonld Dataset Proxy representing all subjects in the dataset matching the given predicate, object, and graph.
   *
   * @param predicate - A valid Predicate Node (NamedNode) or a string URI.
   * @param object - A valid object node (NamedNode, Blank Node, or Literal) or a string URI.
   * @param graph - A valid graph node (NamedNode or DefaultGraph) or a string URI.
   *
   * @returns A Linked Data Object Array with all subjects the match the provided nodes.
   *
   * @example
   * ```typescript
   * const profiles = ldoDataset
   *   .usingType(FoafProfileShapeType)
   *   .matchSubject(
   *     namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
   *     namedNode("http://xmlns.com/foaf/0.1/Person")
   *   );
   * profiles.forEach((person) => {
   *   console.log(person.fn);
   * });
   * ```
   */
  matchSubject(
    predicate: QuadMatch[1] | string,
    object?: QuadMatch[2] | string,
    graph?: QuadMatch[3] | string,
  ): LdSet<Type> {
    return this.jsonldDatasetProxyBuilder.matchSubject<Type>(
      predicate != undefined ? normalizeNodeName(predicate) : undefined,
      object != undefined ? normalizeNodeName(object) : undefined,
      graph != undefined ? normalizeNodeName(graph) : undefined,
    );
  }

  /**
   * `matchObject` returns a Jsonld Dataset Proxy representing all objects in the dataset matching the given subject, predicate, and graph.
   *
   * @param subject - A valid object node (NamedNode or Blank Node) or a string URI.
   * @param predicate - A valid Predicate Node (NamedNode) or a string URI.
   * @param graph - A valid graph node (NamedNode or DefaultGraph) or a string URI.
   *
   * @returns  A Linked Data Object Array with all objects the match the provided nodes.
   *
   * @example
   * ```typescript
   * matchObject(
   *   subject?: SubjectNode | string,
   *   predicate?: PredicateNode | string,
   *   graph?: GraphNode | string,
   * ): Type[]
   * ```
   */
  matchObject(
    subject?: QuadMatch[0] | string,
    predicate?: QuadMatch[1] | string,
    graph?: QuadMatch[3] | string,
  ): LdSet<Type> {
    return this.jsonldDatasetProxyBuilder.matchObject<Type>(
      subject != undefined ? normalizeNodeName(subject) : undefined,
      predicate != undefined ? normalizeNodeName(predicate) : undefined,
      graph != undefined ? normalizeNodeName(graph) : undefined,
    );
  }

  /**
   * `fromJson` will take any regular Json, add the information to the dataset, and return a Jsonld Dataset Proxy representing the given data.
   *
   * @param inputData - Initial data matching the type
   * @returns A linked data object or linked data object array depending on the input
   *
   * @example
   * ```typescript
   * const person2 = ldoDataset
   *   .usingType(FoafProfileShapeType)
   *   .fromJson({
   *     "@id": "http://example.com/Person2",
   *     fn: ["Jane Doe"],
   *   });
   * ```
   */
  fromJson(inputData: Type): Type {
    return this.jsonldDatasetProxyBuilder.fromJson<Type>(inputData);
  }

  /**
   * Designates that all Linked Data Objects created should write to the specified graphs. By default, all new quads are added to the default graph, but you can change the graph to which new quads are added.
   *
   * NOTE: These operations only dictate the graph for new triples. Any operations that delete triples will delete triples regardless of their graph.
   *
   * @param graphs - any number of Graph Nodes or string URIs that all add operations will be put in.
   *
   * @returns An LdoBuilder for constructor chaining
   *
   * @example
   * ```typescript
   * const person1 = ldoDataset.usingType(FoafShapeType)
   *   .write(namedNode("http://example.com/ExampleGraph"))
   *   .fromSubject(namedNode("http://example.com/Person1"));
   * person1.name.push("Jack");
   * console.log(dataset.toString());
   * // Logs:
   * // <http://example.com/Person1> <http://xmlns.com/foaf/0.1/name> "Jack" <http://example.com/ExampleGraph> .
   * ```
   */
  write(...graphs: (GraphNode | string)[]): LdoBuilder<Type> {
    return new LdoBuilder(
      this.jsonldDatasetProxyBuilder.write(...normalizeNodeNames(graphs)),
      this.shapeType,
    );
  }

  /**
   * Sets the order of language preferences for Language Strings. Acceptable values are EITF language tags, "@none" and "@other"
   *
   * @param languageOrdering - The order languages will be selected. Acceptable values are EITF language tags, "@none" and "@other".
   *
   * @returns An LdoBuilder for constructor chaining
   *
   * @example
   * ```typescript
   * // Read Spansih first, then Korean, then language strings with no language
   * // New writes are in Spanish
   * ["es", "ko", "@none"]
   *
   * // Read any language other than french, then french
   * // New writes are in French
   * ["@other", "fr"]
   * ```
   */
  setLanguagePreferences(
    ...languageOrdering: LanguageOrdering
  ): LdoBuilder<Type> {
    return new LdoBuilder(
      this.jsonldDatasetProxyBuilder.setLanguagePreferences(
        ...languageOrdering,
      ),
      this.shapeType,
    );
  }
}
