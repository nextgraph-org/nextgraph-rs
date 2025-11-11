import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * containerSchema: Schema for container
 * =============================================================================
 */
export const containerSchema: Schema = {
  "http://www.w3.org/ns/lddps#Container": {
    iri: "http://www.w3.org/ns/lddps#Container",
    predicates: [
      {
        dataTypes: [
          {
            valType: "literal",
            literals: [
              "http://www.w3.org/ns/ldp#Container",
              "http://www.w3.org/ns/ldp#Resource",
            ],
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "http://purl.org/dc/terms/modified",
        readablePredicate: "modified",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "http://www.w3.org/ns/ldp#contains",
        readablePredicate: "contains",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "http://www.w3.org/ns/posix/stat#mtime",
        readablePredicate: "mtime",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "http://www.w3.org/ns/posix/stat#size",
        readablePredicate: "size",
      },
    ],
  },
};
