import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * solidContext: JSONLD Context for solid
 * =============================================================================
 */
export const solidContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Container: {
    "@id": "http://www.w3.org/ns/ldp#Container",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      modified: {
        "@id": "http://purl.org/dc/terms/modified",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      contains: {
        "@id": "http://www.w3.org/ns/ldp#contains",
        "@type": "@id",
        "@isCollection": true,
      },
      mtime: {
        "@id": "http://www.w3.org/ns/posix/stat#mtime",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      size: {
        "@id": "http://www.w3.org/ns/posix/stat#size",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
    },
  },
  Resource: {
    "@id": "http://www.w3.org/ns/ldp#Resource",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      modified: {
        "@id": "http://purl.org/dc/terms/modified",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      contains: {
        "@id": "http://www.w3.org/ns/ldp#contains",
        "@type": "@id",
        "@isCollection": true,
      },
      mtime: {
        "@id": "http://www.w3.org/ns/posix/stat#mtime",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      size: {
        "@id": "http://www.w3.org/ns/posix/stat#size",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
    },
  },
  modified: {
    "@id": "http://purl.org/dc/terms/modified",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  contains: {
    "@id": "http://www.w3.org/ns/ldp#contains",
    "@type": "@id",
    "@isCollection": true,
  },
  Resource2: {
    "@id": "http://www.w3.org/ns/iana/media-types/text/turtle#Resource",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      modified: {
        "@id": "http://purl.org/dc/terms/modified",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      mtime: {
        "@id": "http://www.w3.org/ns/posix/stat#mtime",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      size: {
        "@id": "http://www.w3.org/ns/posix/stat#size",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
    },
  },
  mtime: {
    "@id": "http://www.w3.org/ns/posix/stat#mtime",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  size: {
    "@id": "http://www.w3.org/ns/posix/stat#size",
    "@type": "http://www.w3.org/2001/XMLSchema#integer",
  },
  storage: {
    "@id": "http://www.w3.org/ns/pim/space#storage",
    "@type": "@id",
    "@isCollection": true,
  },
};
