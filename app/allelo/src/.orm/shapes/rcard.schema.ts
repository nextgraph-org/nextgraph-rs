import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * rcardSchema: Schema for rcard
 * =============================================================================
 */
export const rcardSchema: Schema = {
  "did:ng:x:social:rcard:permission#RCardPermissionTriple": {
    iri: "did:ng:x:social:rcard:permission#RCardPermissionTriple",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#firstLevel",
        readablePredicate: "firstLevel",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:rcard:permission#secondLevel",
        readablePredicate: "secondLevel",
      },
    ],
  },
  "did:ng:x:social:rcard:permission#RCardPermission": {
    iri: "did:ng:x:social:rcard:permission#RCardPermission",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#node",
        readablePredicate: "node",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:rcard:permission#firstLevel",
        readablePredicate: "firstLevel",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#secondLevel",
        readablePredicate: "secondLevel",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:social:rcard:permission#RCardPermission||did:ng:x:social:rcard:permission#triple",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#triple",
        readablePredicate: "triple",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:social:rcard:permission:zone#top"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:social:rcard:permission:zone#bottom"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:social:rcard:permission:zone#middle"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:rcard:permission#zone",
        readablePredicate: "zone",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard#order",
        readablePredicate: "order",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#isPermissionGiven",
        readablePredicate: "isPermissionGiven",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#isMultiple",
        readablePredicate: "isMultiple",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#selector",
        readablePredicate: "selector",
      },
    ],
  },
  "did:ng:x:social:rcard:permission#RCardPermission||did:ng:x:social:rcard:permission#triple":
    {
      iri: "did:ng:x:social:rcard:permission#RCardPermission||did:ng:x:social:rcard:permission#triple",
      predicates: [
        {
          dataTypes: [
            {
              valType: "string",
            },
          ],
          maxCardinality: 1,
          minCardinality: 0,
          iri: "did:ng:x:social:rcard:permission#firstLevel",
          readablePredicate: "firstLevel",
        },
        {
          dataTypes: [
            {
              valType: "string",
            },
          ],
          maxCardinality: 1,
          minCardinality: 1,
          iri: "did:ng:x:social:rcard:permission#secondLevel",
          readablePredicate: "secondLevel",
        },
      ],
    },
  "did:ng:x:social:rcard#RCard": {
    iri: "did:ng:x:social:rcard#RCard",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:x:social:rcard#Card"],
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
        iri: "did:ng:x:social:rcard#cardId",
        readablePredicate: "cardId",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard#order",
        readablePredicate: "order",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:social:rcard#RCard||did:ng:x:social:rcard:permission#permission",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#permission",
        readablePredicate: "permission",
      },
    ],
  },
  "did:ng:x:social:rcard#RCard||did:ng:x:social:rcard:permission#permission": {
    iri: "did:ng:x:social:rcard#RCard||did:ng:x:social:rcard:permission#permission",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#node",
        readablePredicate: "node",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:rcard:permission#firstLevel",
        readablePredicate: "firstLevel",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#secondLevel",
        readablePredicate: "secondLevel",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:social:rcard:permission#RCardPermission||did:ng:x:social:rcard:permission#triple",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#triple",
        readablePredicate: "triple",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:social:rcard:permission:zone#top"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:social:rcard:permission:zone#bottom"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:social:rcard:permission:zone#middle"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:rcard:permission#zone",
        readablePredicate: "zone",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard#order",
        readablePredicate: "order",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#isPermissionGiven",
        readablePredicate: "isPermissionGiven",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#isMultiple",
        readablePredicate: "isMultiple",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:rcard:permission#selector",
        readablePredicate: "selector",
      },
    ],
  },
};
