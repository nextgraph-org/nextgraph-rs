import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * socialqueryContext: JSONLD Context for socialquery
 * =============================================================================
 */
export const socialqueryContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  SocialQuery: {
    "@id": "did:ng:x:class#SocialQuery",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      socialQuerySparql: {
        "@id": "did:ng:x:ng#social_query_sparql",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      socialQueryForwarder: {
        "@id": "did:ng:x:ng#social_query_forwarder",
        "@type": "@id",
      },
      socialQueryEnded: {
        "@id": "did:ng:x:ng#social_query_ended",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    },
  },
  socialQuerySparql: {
    "@id": "did:ng:x:ng#social_query_sparql",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  socialQueryForwarder: {
    "@id": "did:ng:x:ng#social_query_forwarder",
    "@type": "@id",
  },
  socialQueryEnded: {
    "@id": "did:ng:x:ng#social_query_ended",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
};
