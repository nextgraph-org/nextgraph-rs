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
};
