import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * groupContext: JSONLD Context for group
 * =============================================================================
 */
export const groupContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Group: {
    "@id": "did:ng:x:social:group#Group",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      title: {
        "@id": "did:ng:x:social:group#title",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      description: {
        "@id": "did:ng:x:social:group#description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      tag: {
        "@id": "did:ng:x:social:group#tag",
        "@type": "@id",
        "@isCollection": true,
      },
      logoIRI: {
        "@id": "did:ng:x:social:group#logoIRI",
        "@type": "@id",
      },
      hasMember: {
        "@id": "did:ng:x:social:group#hasMember",
        "@type": "@id",
        "@isCollection": true,
      },
      hasAdmin: {
        "@id": "did:ng:x:social:group#hasAdmin",
        "@type": "@id",
        "@isCollection": true,
      },
      createdAt: {
        "@id": "did:ng:x:social:group#createdAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      post: {
        "@id": "did:ng:x:social:group#post",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  title: {
    "@id": "did:ng:x:social:group#title",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  description: {
    "@id": "did:ng:x:social:group#description",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  tag: {
    "@id": "did:ng:x:social:group#tag",
    "@type": "@id",
    "@isCollection": true,
  },
  logoIRI: {
    "@id": "did:ng:x:social:group#logoIRI",
    "@type": "@id",
  },
  hasMember: {
    "@id": "did:ng:x:social:group#hasMember",
    "@type": "@id",
    "@isCollection": true,
  },
  hasAdmin: {
    "@id": "did:ng:x:social:group#hasAdmin",
    "@type": "@id",
    "@isCollection": true,
  },
  createdAt: {
    "@id": "did:ng:x:social:group#createdAt",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  post: {
    "@id": "did:ng:x:social:group#post",
    "@type": "@id",
    "@isCollection": true,
  },
  Post: {
    "@id": "did:ng:x:social:post#Post",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      author: {
        "@id": "did:ng:x:social:post#author",
        "@type": "@id",
        "@isCollection": true,
      },
      createdAt: {
        "@id": "did:ng:x:social:post#createdAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      tag: {
        "@id": "did:ng:x:social:post#tag",
        "@type": "@id",
        "@isCollection": true,
      },
      description: {
        "@id": "did:ng:x:social:post#description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
    },
  },
  author: {
    "@id": "did:ng:x:social:post#author",
    "@type": "@id",
    "@isCollection": true,
  },
  createdAt2: {
    "@id": "did:ng:x:social:post#createdAt",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  tag2: {
    "@id": "did:ng:x:social:post#tag",
    "@type": "@id",
    "@isCollection": true,
  },
  description2: {
    "@id": "did:ng:x:social:post#description",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
};
