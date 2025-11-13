import { Schema } from "shexj";

/**
 * =============================================================================
 * rcardSchema: ShexJ Schema for rcard
 * =============================================================================
 */
export const rcardSchema: Schema = {
  type: "Schema",
  shapes: [
    {
      id: "did:ng:x:social:rcard:permission#RCardPermissionTriple",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#firstLevel",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "First level property key from ContactLdSetProperties if differs from RCardPermission",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#secondLevel",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Second level property or selector",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:social:rcard:permission#RCardPermission",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#node",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Instance object of the property",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#firstLevel",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "First level property key from ContactLdSetProperties",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#secondLevel",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Second level property or selector",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#triple",
              valueExpr:
                "did:ng:x:social:rcard:permission#RCardPermissionTriple",
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Nested permission triples",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#zone",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:social:rcard:permission:zone#top",
                  "did:ng:k:social:rcard:permission:zone#bottom",
                  "did:ng:k:social:rcard:permission:zone#middle",
                ],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Display zone for the property",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard#order",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#integer",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Display order within a zone",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#isPermissionGiven",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether permission is granted for this property",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#isMultiple",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether multiple values are allowed",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#selector",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Selector for the property",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:social:rcard#RCard",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
              valueExpr: {
                type: "NodeConstraint",
                values: ["did:ng:x:social:rcard#Card"],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Defines the node as an RCard",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard#cardId",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Unique identifier for the relationship category",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard#order",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#integer",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Display order",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:rcard:permission#permission",
              valueExpr: "did:ng:x:social:rcard:permission#RCardPermission",
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "Permissions associated with this relationship category",
                  },
                },
              ],
            },
          ],
        },
        extra: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
      },
    },
  ],
};
