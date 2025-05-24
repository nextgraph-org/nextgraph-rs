import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for socialquery
 * =============================================================================
 */

/**
 * SocialQuery Type
 */
export interface SocialQuery {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: {
    "@id": "SocialQuery";
  };
  socialQuerySparql?: string;
  socialQueryForwarder?: {
    "@id": string;
  };
  socialQueryEnded?: string;
}
