import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * wacContext: JSONLD Context for wac
 * =============================================================================
 */
export const wacContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
  },
  Authorization: {
    "@id": "http://www.w3.org/ns/auth/acl#Authorization",
    "@context": {
      type: {
        "@id": "@type",
      },
      accessTo: {
        "@id": "http://www.w3.org/ns/auth/acl#accessTo",
        "@type": "@id",
      },
      default: {
        "@id": "http://www.w3.org/ns/auth/acl#default",
        "@type": "@id",
      },
      agent: {
        "@id": "http://www.w3.org/ns/auth/acl#agent",
        "@type": "@id",
        "@isCollection": true,
      },
      agentGroup: {
        "@id": "http://www.w3.org/ns/auth/acl#agentGroup",
        "@type": "@id",
        "@isCollection": true,
      },
      agentClass: {
        "@id": "http://www.w3.org/ns/auth/acl#agentClass",
        "@isCollection": true,
      },
      mode: {
        "@id": "http://www.w3.org/ns/auth/acl#mode",
        "@isCollection": true,
      },
    },
  },
  accessTo: {
    "@id": "http://www.w3.org/ns/auth/acl#accessTo",
    "@type": "@id",
  },
  default: {
    "@id": "http://www.w3.org/ns/auth/acl#default",
    "@type": "@id",
  },
  agent: {
    "@id": "http://www.w3.org/ns/auth/acl#agent",
    "@type": "@id",
    "@isCollection": true,
  },
  agentGroup: {
    "@id": "http://www.w3.org/ns/auth/acl#agentGroup",
    "@type": "@id",
    "@isCollection": true,
  },
  agentClass: {
    "@id": "http://www.w3.org/ns/auth/acl#agentClass",
    "@isCollection": true,
  },
  AuthenticatedAgent: "http://www.w3.org/ns/auth/acl#AuthenticatedAgent",
  Agent: "http://xmlns.com/foaf/0.1/Agent",
  mode: {
    "@id": "http://www.w3.org/ns/auth/acl#mode",
    "@isCollection": true,
  },
  Read: "http://www.w3.org/ns/auth/acl#Read",
  Write: "http://www.w3.org/ns/auth/acl#Write",
  Append: "http://www.w3.org/ns/auth/acl#Append",
  Control: "http://www.w3.org/ns/auth/acl#Control",
};
