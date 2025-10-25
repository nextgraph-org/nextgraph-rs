import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * catShapeSchema: Schema for catShape
 * =============================================================================
 */
export const catShapeSchema: Schema = {
  "http://example.org/CatShape": {
    iri: "http://example.org/CatShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["http://example.org/Cat"],
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
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/age",
        readablePredicate: "age",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/numberOfHomes",
        readablePredicate: "numberOfHomes",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "http://example.org/CatShape||http://example.org/address",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/address",
        readablePredicate: "address",
      },
    ],
  },
  "http://example.org/CatShape||http://example.org/address": {
    iri: "http://example.org/CatShape||http://example.org/address",
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
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/floor",
        readablePredicate: "floor",
      },
    ],
  },
};
