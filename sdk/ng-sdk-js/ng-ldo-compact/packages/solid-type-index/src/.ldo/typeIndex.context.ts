import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * typeIndexContext: JSONLD Context for typeIndex
 * =============================================================================
 */
export const typeIndexContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
  },
  TypeIndex: {
    "@id": "http://www.w3.org/ns/solid/terms#TypeIndex",
    "@context": {
      type: {
        "@id": "@type",
      },
    },
  },
  ListedDocument: {
    "@id": "http://www.w3.org/ns/solid/terms#ListedDocument",
    "@context": {
      type: {
        "@id": "@type",
      },
    },
  },
  TypeRegistration: {
    "@id": "http://www.w3.org/ns/solid/terms#TypeRegistration",
    "@context": {
      type: {
        "@id": "@type",
      },
      forClass: {
        "@id": "http://www.w3.org/ns/solid/terms#forClass",
        "@type": "@id",
      },
      instance: {
        "@id": "http://www.w3.org/ns/solid/terms#instance",
        "@type": "@id",
        "@isCollection": true,
      },
      instanceContainer: {
        "@id": "http://www.w3.org/ns/solid/terms#instanceContainer",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  forClass: {
    "@id": "http://www.w3.org/ns/solid/terms#forClass",
    "@type": "@id",
  },
  instance: {
    "@id": "http://www.w3.org/ns/solid/terms#instance",
    "@type": "@id",
    "@isCollection": true,
  },
  instanceContainer: {
    "@id": "http://www.w3.org/ns/solid/terms#instanceContainer",
    "@type": "@id",
    "@isCollection": true,
  },
};
