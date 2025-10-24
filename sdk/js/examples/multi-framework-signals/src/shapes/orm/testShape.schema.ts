import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * testShapeSchema: Schema for testShape
 * =============================================================================
 */
export const testShapeSchema: Schema = {
  "http://example.org/TestObjectShape": {
    iri: "http://example.org/TestObjectShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["http://example.org/TestObject"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        minCardinality: 1,
        iri: "http://example.org/stringValue",
        readablePredicate: "stringValue",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/numValue",
        readablePredicate: "numValue",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/boolValue",
        readablePredicate: "boolValue",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "http://example.org/arrayValue",
        readablePredicate: "arrayValue",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "http://example.org/TestObjectShape||http://example.org/objectValue",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/objectValue",
        readablePredicate: "objectValue",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "http://example.org/TestObjectShape||http://example.org/anotherObject",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "http://example.org/anotherObject",
        readablePredicate: "anotherObject",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/numOrStr",
        readablePredicate: "numOrStr",
      },
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["lit1"],
          },
          {
            valType: "literal",
            literals: ["lit2"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/lit1Or2",
        readablePredicate: "lit1Or2",
      },
    ],
  },
  "http://example.org/TestObjectShape||http://example.org/objectValue": {
    iri: "http://example.org/TestObjectShape||http://example.org/objectValue",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/nestedString",
        readablePredicate: "nestedString",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/nestedNum",
        readablePredicate: "nestedNum",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "http://example.org/nestedArray",
        readablePredicate: "nestedArray",
      },
    ],
  },
  "http://example.org/TestObjectShape||http://example.org/anotherObject": {
    iri: "http://example.org/TestObjectShape||http://example.org/anotherObject",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/prop1",
        readablePredicate: "prop1",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/prop2",
        readablePredicate: "prop2",
      },
    ],
  },
};
