import type { CompactSchema } from "@ldo/ldo";

/**
 * =============================================================================
 * personShapeSchema: Compact Schema for personShape
 * =============================================================================
 */
export const personShapeSchema: CompactSchema = {
  "http://example.org/Person": {
    iri: "http://example.org/Person",
    predicates: [
      {
        type: "literal",
        literalValue: ["Person"],
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "type",
      },
      {
        type: "string",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/name",
        readablePredicate: "name",
      },
      {
        type: "nested",
        nestedSchema: "http://example.org/Person::http://example.org/address",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/address",
        readablePredicate: "address",
      },
      {
        type: "boolean",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/hasChildren",
        readablePredicate: "hasChildren",
      },
      {
        type: "number",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/numberOfHouses",
        readablePredicate: "numberOfHouses",
      },
    ],
  },
  "http://example.org/Person::http://example.org/address": {
    iri: "http://example.org/Person::http://example.org/address",
    predicates: [
      {
        type: "string",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/street",
        readablePredicate: "street",
      },
      {
        type: "string",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/houseNumber",
        readablePredicate: "houseNumber",
      },
    ],
  },
};
