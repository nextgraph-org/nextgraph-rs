import { Schema } from "shexj";

/**
 * =============================================================================
 * socialquerySchema: ShexJ Schema for socialquery
 * =============================================================================
 */
export const socialquerySchema: Schema = {
  type: "Schema",
  shapes: [
    {
      id: "did:ng:x:shape#SocialQuery",
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
                values: ["did:ng:x:class#SocialQuery"],
              },
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:ng#social_query_sparql",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:ng#social_query_forwarder",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:ng#social_query_ended",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
              },
              min: 0,
              max: 1,
            },
          ],
        },
        extra: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
      },
    },
  ],
};
