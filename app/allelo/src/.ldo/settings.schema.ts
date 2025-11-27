import { Schema } from "shexj";

/**
 * =============================================================================
 * settingsSchema: ShexJ Schema for settings
 * =============================================================================
 */
export const settingsSchema: Schema = {
  type: "Schema",
  shapes: [
    {
      id: "did:ng:x:settings#AppSettings",
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
                values: ["did:ng:x:settings#Settings"],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Defines the node as App Settings",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:settings#onboardingStep",
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
                    value: "Current onboarding step (0-based index)",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:settings#isOnboardingFinished",
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
                    value: "Whether the user has completed onboarding",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:settings#lnImportRequested",
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
                    value: "Whether LinkedIn import has been requested",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:settings#greencheckId",
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
                    value: "id from greencheck",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:settings#greencheckToken",
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
                    value: "temporary token from greencheck",
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
