import type { ContextDefinition, ExpandedTermDefinition } from "jsonld";
import type {
  LdoJsonldContext,
  LdoJsonldContextExpandedTermDefinition,
} from "./LdoJsonldContext.js";
import type { NamedNode } from "@rdfjs/types";

// Create JSONLD Shorthands
const shorthandToIriMap: Record<string, string> = {
  "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
};

/**
 * Context Util
 * Handles the JSON-LD context and allows conversion between IRIs and terms
 */
export class ContextUtil {
  public readonly context: ContextDefinition | LdoJsonldContext;
  private iriToKeyMap: Record<string, string>;
  private typeNameToIriToKeyMap: Record<string, Record<string, string>>;

  constructor(context: ContextDefinition | LdoJsonldContext) {
    this.context = context;
    this.iriToKeyMap = {};

    // Create the iriToKeyMap
    this.iriToKeyMap = this.createIriToKeyMap(context);
    this.typeNameToIriToKeyMap = {};
    Object.entries(context).forEach(([contextKey, contextValue]) => {
      if (
        typeof contextValue === "object" &&
        contextValue !== null &&
        !!contextValue["@id"] &&
        (contextValue as ExpandedTermDefinition)["@context"]
      ) {
        this.typeNameToIriToKeyMap[contextKey] = this.createIriToKeyMap(
          contextValue["@context"],
        );
      }
    });
  }

  private createIriToKeyMap(
    context: ContextDefinition,
  ): Record<string, string> {
    const iriToKeyMap = {};
    Object.entries(context).forEach(([contextKey, contextValue]) => {
      if (typeof contextValue === "string") {
        iriToKeyMap[this.keyIdToIri(contextValue)] = contextKey;
      } else if (
        typeof contextValue === "object" &&
        contextValue !== null &&
        !!contextValue["@id"]
      ) {
        const iri = this.keyIdToIri(contextValue["@id"]);
        iriToKeyMap[iri] = contextKey;
      }
    });
    return iriToKeyMap;
  }

  /**
   * Helper method that gets the relevant context to use if a typename is
   * provided
   */
  private getRelevantContext(
    key: string,
    typeNames: NamedNode[],
  ): ContextDefinition | LdoJsonldContext {
    for (const typeNameNode of typeNames) {
      const typeName = this.iriToKey((typeNameNode as NamedNode).value, []);
      if (
        typeof this.context[typeName] === "object" &&
        this.context[typeName]?.["@context"] &&
        this.context[typeName]?.["@context"][key]
      ) {
        return this.context[typeName]?.["@context"];
      }
    }
    return this.context;
  }

  /**
   * Helper function that applies shorthands to keys
   */
  private keyIdToIri(keyId: string) {
    if (shorthandToIriMap[keyId]) {
      return shorthandToIriMap[keyId];
    } else {
      return keyId;
    }
  }

  /**
   * Converts a given JsonLd key into an RDF IRI
   */
  public keyToIri(key: string, typeName: NamedNode[]): string {
    const relevantContext = this.getRelevantContext(key, typeName);
    if (!relevantContext[key]) {
      return key;
    } else if (typeof relevantContext[key] === "string") {
      return this.keyIdToIri(relevantContext[key] as string);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else if (relevantContext[key] && (relevantContext[key] as any)["@id"]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.keyIdToIri((relevantContext[key] as any)["@id"]);
    }
    return key;
  }

  /**
   * Converts a given RDF IRI into the JsonLd key
   */
  public iriToKey(iri: string, typeNames: NamedNode[]): string {
    let relevantMap = this.iriToKeyMap;
    for (const typeNameNode of typeNames) {
      const typeName = this.iriToKey((typeNameNode as NamedNode).value, []);
      relevantMap = this.typeNameToIriToKeyMap[typeName]?.[iri]
        ? this.typeNameToIriToKeyMap[typeName]
        : this.iriToKeyMap;
    }
    if (relevantMap[iri]) {
      return relevantMap[iri];
    }
    return iri;
  }

  /**
   * Returns the IRI of a datatype of a specific object
   */
  public getDataType(key: string, typeName: NamedNode[]): string {
    const relevantContext = this.getRelevantContext(key, typeName);
    if (
      typeof relevantContext[key] === "object" &&
      (relevantContext[key] as ExpandedTermDefinition)["@type"]
    ) {
      return (relevantContext[key] as ExpandedTermDefinition)[
        "@type"
      ] as string;
    }
    return "http://www.w3.org/2001/XMLSchema#string";
  }

  /**
   * Returns true if the object is a collection
   */
  public isSet(key: string, typeName: NamedNode[]): boolean {
    const relevantContext = this.getRelevantContext(key, typeName);
    return !!(
      relevantContext[key] &&
      typeof relevantContext[key] === "object" &&
      ((relevantContext[key] as ExpandedTermDefinition)["@container"] ===
        "@set" ||
        (relevantContext[key] as LdoJsonldContextExpandedTermDefinition)[
          "@isCollection"
        ])
    );
  }

  /**
   * Returns true if the object is a language string
   */
  public isLangString(key: string, typeName: NamedNode[]): boolean {
    const relevantContext = this.getRelevantContext(key, typeName);
    return !!(
      relevantContext[key] &&
      typeof relevantContext[key] === "object" &&
      (relevantContext[key] as ExpandedTermDefinition)["@type"] &&
      (relevantContext[key] as ExpandedTermDefinition)["@type"] ===
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
    );
  }
}
