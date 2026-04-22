import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * testShapeSchema: Schema for testShape
 * =============================================================================
 */
export const testShapeSchema = {
  "did:ng:z:RootShape": {
    iri: "did:ng:z:RootShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:Root"],
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
        iri: "did:ng:z:aString",
        readablePredicate: "aString",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:anInteger",
        readablePredicate: "anInteger",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:aDate",
        readablePredicate: "aDate",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:aBoolean",
        readablePredicate: "aBoolean",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:aStringOrBoolean",
        readablePredicate: "aStringOrBoolean",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "did:ng:z:ChildShape1",
          },
          {
            valType: "shape",
            shape: "did:ng:z:ChildShape2",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:z:children1Or2",
        readablePredicate: "children1Or2",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "did:ng:z:ChildShape3",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:child3",
        readablePredicate: "child3",
      },
    ],
  },
  "did:ng:z:ChildShape1": {
    iri: "did:ng:z:ChildShape1",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:MiruVideoEffectAsset"],
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
        iri: "did:ng:z:childString",
        readablePredicate: "childString",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:childBoolean",
        readablePredicate: "childBoolean",
      },
    ],
  },
  "did:ng:z:ChildShape2": {
    iri: "did:ng:z:ChildShape2",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:Child"],
          },
          {
            valType: "iri",
            literals: ["did:ng:z:Child2"],
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
        iri: "did:ng:z:childString",
        readablePredicate: "childString",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:childNumber:",
        readablePredicate: "childNumber",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "did:ng:z:ChildChildShape",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:childChild",
        readablePredicate: "childChild",
      },
    ],
  },
  "did:ng:z:ChildShape3": {
    iri: "did:ng:z:ChildShape3",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:Child2"],
          },
          {
            valType: "iri",
            literals: ["did:ng:z:Child"],
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
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:childBoolean:",
        readablePredicate: "childBoolean",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "did:ng:z:ChildChildShape",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:childChild",
        readablePredicate: "childChild",
      },
    ],
  },
  "did:ng:z:ChildChildShape": {
    iri: "did:ng:z:ChildChildShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:ChildChild"],
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
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:childChildNum",
        readablePredicate: "childChildNum",
      },
    ],
  },
} as const satisfies Schema;
