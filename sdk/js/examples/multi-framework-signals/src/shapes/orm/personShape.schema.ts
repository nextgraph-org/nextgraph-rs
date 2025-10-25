import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * personShapeSchema: Schema for personShape
 * =============================================================================
 */
export const personShapeSchema: Schema = {
  "http://example.org/PersonShape": {
    iri: "http://example.org/PersonShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["http://example.org/Person"],
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
        iri: "http://example.org/name",
        readablePredicate: "name",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "http://example.org/PersonShape||http://example.org/address",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/address",
        readablePredicate: "address",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/hasChildren",
        readablePredicate: "hasChildren",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/numberOfHouses",
        readablePredicate: "numberOfHouses",
      },
    ],
  },
  "http://example.org/PersonShape||http://example.org/address": {
    iri: "http://example.org/PersonShape||http://example.org/address",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/street",
        readablePredicate: "street",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/houseNumber",
        readablePredicate: "houseNumber",
      },
    ],
  },
};
