import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * basicSchema: Schema for basic
 * =============================================================================
 */
export const basicSchema: Schema = {
  "http://example.org/BasicShape": {
    iri: "http://example.org/BasicShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["http://example.org/Basic"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/basicString",
        readablePredicate: "basicString",
      },
    ],
  },
};
