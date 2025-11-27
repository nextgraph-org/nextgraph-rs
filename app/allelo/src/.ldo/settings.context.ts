import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * settingsContext: JSONLD Context for settings
 * =============================================================================
 */
export const settingsContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Settings: {
    "@id": "did:ng:x:settings#Settings",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      onboardingStep: {
        "@id": "did:ng:x:settings#onboardingStep",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
      isOnboardingFinished: {
        "@id": "did:ng:x:settings#isOnboardingFinished",
        "@type": "http://www.w3.org/2001/XMLSchema#boolean",
      },
      lnImportRequested: {
        "@id": "did:ng:x:settings#lnImportRequested",
        "@type": "http://www.w3.org/2001/XMLSchema#boolean",
      },
      greencheckId: {
        "@id": "did:ng:x:settings#greencheckId",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      greencheckToken: {
        "@id": "did:ng:x:settings#greencheckToken",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
    },
  },
  onboardingStep: {
    "@id": "did:ng:x:settings#onboardingStep",
    "@type": "http://www.w3.org/2001/XMLSchema#integer",
  },
  isOnboardingFinished: {
    "@id": "did:ng:x:settings#isOnboardingFinished",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  lnImportRequested: {
    "@id": "did:ng:x:settings#lnImportRequested",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  greencheckId: {
    "@id": "did:ng:x:settings#greencheckId",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  greencheckToken: {
    "@id": "did:ng:x:settings#greencheckToken",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
};
