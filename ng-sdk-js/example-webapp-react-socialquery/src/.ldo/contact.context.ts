import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * contactContext: JSONLD Context for contact
 * =============================================================================
 */
export const contactContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
  },
  Individual: {
    "@id": "http://www.w3.org/2006/vcard/ns#Individual",
    "@context": {
      type: {
        "@id": "@type",
      },
      fn: {
        "@id": "http://www.w3.org/2006/vcard/ns#fn",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasEmail: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasRating: {
        "@id": "did:ng:x:skills#hasRating",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  Person: {
    "@id": "http://schema.org/Person",
    "@context": {
      type: {
        "@id": "@type",
      },
      fn: {
        "@id": "http://www.w3.org/2006/vcard/ns#fn",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasEmail: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasRating: {
        "@id": "did:ng:x:skills#hasRating",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  Person2: {
    "@id": "http://xmlns.com/foaf/0.1/Person",
    "@context": {
      type: {
        "@id": "@type",
      },
      fn: {
        "@id": "http://www.w3.org/2006/vcard/ns#fn",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasEmail: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasRating: {
        "@id": "did:ng:x:skills#hasRating",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  fn: {
    "@id": "http://www.w3.org/2006/vcard/ns#fn",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  hasEmail: {
    "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  hasRating: {
    "@id": "did:ng:x:skills#hasRating",
    "@type": "@id",
    "@isCollection": true,
  },
  Rating: {
    "@id": "did:ng:x:skills#Rating",
    "@context": {
      type: {
        "@id": "@type",
      },
      rated: {
        "@id": "did:ng:x:skills#rated",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
      skill: {
        "@id": "did:ng:x:skills#skill",
      },
    },
  },
  rated: {
    "@id": "did:ng:x:skills#rated",
    "@type": "http://www.w3.org/2001/XMLSchema#integer",
  },
  skill: {
    "@id": "did:ng:x:skills#skill",
  },
  "ng:k:skills:programming:svelte": "did:ng:k:skills:programming:svelte",
  "ng:k:skills:programming:nextjs": "did:ng:k:skills:programming:nextjs",
  "ng:k:skills:programming:react": "did:ng:k:skills:programming:react",
  "ng:k:skills:programming:vuejs": "did:ng:k:skills:programming:vuejs",
  "ng:k:skills:programming:tailwind": "did:ng:k:skills:programming:tailwind",
  "ng:k:skills:programming:rdf": "did:ng:k:skills:programming:rdf",
  "ng:k:skills:programming:rust": "did:ng:k:skills:programming:rust",
  "ng:k:skills:programming:yjs": "did:ng:k:skills:programming:yjs",
  "ng:k:skills:programming:automerge": "did:ng:k:skills:programming:automerge",
};
