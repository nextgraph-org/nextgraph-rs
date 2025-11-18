import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * rcardContext: JSONLD Context for rcard
 * =============================================================================
 */
export const rcardContext: LdoJsonldContext = {
  firstLevel: {
    "@id": "did:ng:x:social:rcard:permission#firstLevel",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  secondLevel: {
    "@id": "did:ng:x:social:rcard:permission#secondLevel",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  node: {
    "@id": "did:ng:x:social:rcard:permission#node",
    "@type": "@id",
  },
  triple: {
    "@id": "did:ng:x:social:rcard:permission#triple",
    "@type": "@id",
    "@isCollection": true,
  },
  zone: {
    "@id": "did:ng:x:social:rcard:permission#zone",
    "@isCollection": true,
  },
  top: "did:ng:k:social:rcard:permission:zone#top",
  bottom: "did:ng:k:social:rcard:permission:zone#bottom",
  middle: "did:ng:k:social:rcard:permission:zone#middle",
  order: {
    "@id": "did:ng:x:social:rcard#order",
    "@type": "http://www.w3.org/2001/XMLSchema#integer",
  },
  isPermissionGiven: {
    "@id": "did:ng:x:social:rcard:permission#isPermissionGiven",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  isMultiple: {
    "@id": "did:ng:x:social:rcard:permission#isMultiple",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  selector: {
    "@id": "did:ng:x:social:rcard:permission#selector",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Card: {
    "@id": "did:ng:x:social:rcard#Card",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      cardId: {
        "@id": "did:ng:x:social:rcard#cardId",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      order: {
        "@id": "did:ng:x:social:rcard#order",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
      permission: {
        "@id": "did:ng:x:social:rcard:permission#permission",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  cardId: {
    "@id": "did:ng:x:social:rcard#cardId",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  permission: {
    "@id": "did:ng:x:social:rcard:permission#permission",
    "@type": "@id",
    "@isCollection": true,
  },
};
