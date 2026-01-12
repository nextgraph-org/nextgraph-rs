import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * notificationSchema: Schema for notification
 * =============================================================================
 */
export const notificationSchema: Schema = {
  "did:ng:x:social:notification#UserNotification": {
    iri: "did:ng:x:social:notification#UserNotification",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:x:social:notification#Notification"],
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
        iri: "did:ng:x:social:notification#date",
        readablePredicate: "date",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:notification#body",
        readablePredicate: "body",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:x:social:notification:type#Connection"],
          },
          {
            valType: "iri",
            literals: ["did:ng:x:social:notification:type#System"],
          },
          {
            valType: "iri",
            literals: ["did:ng:x:social:notification:type#Vouch"],
          },
          {
            valType: "iri",
            literals: ["did:ng:x:social:notification:type#Praise"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:notification#type",
        readablePredicate: "type",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:x:social:notification:status#Accepted"],
          },
          {
            valType: "iri",
            literals: ["did:ng:x:social:notification:status#Rejected"],
          },
          {
            valType: "iri",
            literals: ["did:ng:x:social:notification:status#Pending"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:notification#status",
        readablePredicate: "status",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:notification#seen",
        readablePredicate: "seen",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#hidden",
        readablePredicate: "hidden",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:notification#subject",
        readablePredicate: "subject",
      },
    ],
  },
};
