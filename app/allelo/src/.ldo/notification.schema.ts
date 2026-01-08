import { Schema } from "shexj";

/**
 * =============================================================================
 * notificationSchema: ShexJ Schema for notification
 * =============================================================================
 */
export const notificationSchema: Schema = {
  type: "Schema",
  shapes: [
    {
      id: "did:ng:x:social:notification#UserNotification",
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
                values: ["did:ng:x:social:notification#Notification"],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "User-visible notification in the app",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:notification#date",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "When the notification was created",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:notification#body",
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
                    value: "Optional notification body text",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:notification#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:x:social:notification:type#Connection",
                  "did:ng:x:social:notification:type#System",
                  "did:ng:x:social:notification:type#Vouch",
                  "did:ng:x:social:notification:type#Praise",
                ],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Type of the notification",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:notification#status",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:x:social:notification:status#Accepted",
                  "did:ng:x:social:notification:status#Rejected",
                  "did:ng:x:social:notification:status#Pending",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Workflow status of the notification",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:notification#seen",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether the user has seen it",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether the notification is hidden for user",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:social:notification#subject",
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
                    value: "Optional IRI of the SocialContact (sender/subject)",
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
