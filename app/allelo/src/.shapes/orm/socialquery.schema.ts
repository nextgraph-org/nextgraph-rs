import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * socialquerySchema: Schema for socialquery
 * =============================================================================
 */
export const socialquerySchema: Schema = {
  "did:ng:x:shape#SocialQuery": {
    iri: "did:ng:x:shape#SocialQuery",
    predicates: [
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["did:ng:x:class#SocialQuery"],
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
        minCardinality: 0,
        iri: "did:ng:x:ng#social_query_sparql",
        readablePredicate: "social_query_sparql",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:ng#social_query_forwarder",
        readablePredicate: "social_query_forwarder",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:ng#social_query_ended",
        readablePredicate: "social_query_ended",
      },
    ],
  },
};
