import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * profileContext: JSONLD Context for profile
 * =============================================================================
 */
export const profileContext: LdoJsonldContext = {
  privateTypeIndex: {
    "@id": "http://www.w3.org/ns/solid/terms#privateTypeIndex",
    "@type": "@id",
    "@isCollection": true,
  },
  publicTypeIndex: {
    "@id": "http://www.w3.org/ns/solid/terms#publicTypeIndex",
    "@type": "@id",
    "@isCollection": true,
  },
};
