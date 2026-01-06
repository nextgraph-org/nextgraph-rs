import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * settingsSchema: Schema for settings
 * =============================================================================
 */
export const settingsSchema: Schema = {
  "did:ng:x:settings#AppSettings": {
    iri: "did:ng:x:settings#AppSettings",
    predicates: [
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["did:ng:x:settings#Settings"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:settings#onboardingStep",
        readablePredicate: "onboardingStep",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:settings#isOnboardingFinished",
        readablePredicate: "isOnboardingFinished",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:settings#lnImportRequested",
        readablePredicate: "lnImportRequested",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:settings#lnImportFinished",
        readablePredicate: "lnImportFinished",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:settings#greencheckId",
        readablePredicate: "greencheckId",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:settings#greencheckToken",
        readablePredicate: "greencheckToken",
      },
    ],
  },
};
