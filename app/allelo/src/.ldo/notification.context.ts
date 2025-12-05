import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * notificationContext: JSONLD Context for notification
 * =============================================================================
 */
export const notificationContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Notification: {
    "@id": "did:ng:x:social:notification#Notification",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      date: {
        "@id": "did:ng:x:social:notification#date",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      body: {
        "@id": "did:ng:x:social:notification#body",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      type2: {
        "@id": "did:ng:x:social:notification#type",
        "@isCollection": true,
      },
      status: {
        "@id": "did:ng:x:social:notification#status",
        "@isCollection": true,
      },
      seen: {
        "@id": "did:ng:x:social:notification#seen",
        "@type": "http://www.w3.org/2001/XMLSchema#boolean",
      },
      hidden: {
        "@id": "did:ng:x:core#hidden",
        "@type": "http://www.w3.org/2001/XMLSchema#boolean",
      },
      subject: {
        "@id": "did:ng:x:social:notification#subject",
        "@type": "@id",
      },
    },
  },
  date: {
    "@id": "did:ng:x:social:notification#date",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  body: {
    "@id": "did:ng:x:social:notification#body",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  type2: {
    "@id": "did:ng:x:social:notification#type",
    "@isCollection": true,
  },
  Connection: "did:ng:x:social:notification:type#Connection",
  System: "did:ng:x:social:notification:type#System",
  Vouch: "did:ng:x:social:notification:type#Vouch",
  Praise: "did:ng:x:social:notification:type#Praise",
  status: {
    "@id": "did:ng:x:social:notification#status",
    "@isCollection": true,
  },
  Accepted: "did:ng:x:social:notification:status#Accepted",
  Rejected: "did:ng:x:social:notification:status#Rejected",
  Pending: "did:ng:x:social:notification:status#Pending",
  seen: {
    "@id": "did:ng:x:social:notification#seen",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  hidden: {
    "@id": "did:ng:x:core#hidden",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  subject: {
    "@id": "did:ng:x:social:notification#subject",
    "@type": "@id",
  },
};
