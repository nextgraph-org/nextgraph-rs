import type { CompactSchema } from "@ldo/ldo";

/**
 * =============================================================================
 * testShapeSchema: Compact Schema for testShape
 * =============================================================================
 */
export const testShapeSchema: CompactSchema = {
  "http://example.org/TestObject": {
    iri: "http://example.org/TestObject",
    predicates: [
      {
        type: "literal",
        literalValue: ["TestObject"],
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "type",
        extra: true,
      },
      {
        type: "string",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/stringValue",
        readablePredicate: "stringValue",
      },
      {
        type: "number",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/numValue",
        readablePredicate: "numValue",
      },
      {
        type: "boolean",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/boolValue",
        readablePredicate: "boolValue",
      },
      {
        type: "number",
        maxCardinality: -1,
        minCardinality: 0,
        predicateUri: "http://example.org/arrayValue",
        readablePredicate: "arrayValue",
      },
      {
        type: "nested",
        nestedSchema:
          "http://example.org/TestObject::http://example.org/objectValue",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/objectValue",
        readablePredicate: "objectValue",
      },
      {
        type: "nested",
        nestedSchema:
          "http://example.org/TestObject::http://example.org/anotherObject",
        maxCardinality: -1,
        minCardinality: 0,
        predicateUri: "http://example.org/anotherObject",
        readablePredicate: "anotherObject",
      },
      {
        type: "string",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/numOrStr",
        readablePredicate: "numOrStr",
      },
    ],
  },
  "http://example.org/TestObject::http://example.org/objectValue": {
    iri: "http://example.org/TestObject::http://example.org/objectValue",
    predicates: [
      {
        type: "string",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/nestedString",
        readablePredicate: "nestedString",
      },
      {
        type: "number",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/nestedNum",
        readablePredicate: "nestedNum",
      },
      {
        type: "number",
        maxCardinality: -1,
        minCardinality: 0,
        predicateUri: "http://example.org/nestedArray",
        readablePredicate: "nestedArray",
      },
    ],
  },
  "http://example.org/TestObject::http://example.org/anotherObject": {
    iri: "http://example.org/TestObject::http://example.org/anotherObject",
    predicates: [
      {
        type: "string",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/prop1",
        readablePredicate: "prop1",
      },
      {
        type: "number",
        maxCardinality: 1,
        minCardinality: 1,
        predicateUri: "http://example.org/prop2",
        readablePredicate: "prop2",
      },
    ],
  },
};
