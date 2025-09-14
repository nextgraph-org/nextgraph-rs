import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for profile
 * =============================================================================
 */

/**
 * TypeIndexProfile Type
 */
export interface TypeIndexProfile {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * A registry of all types used on the user's Pod (for private access only)
   */
  privateTypeIndex?: LdSet<{
    "@id": string;
  }>;
  /**
   * A registry of all types used on the user's Pod (for public access)
   */
  publicTypeIndex?: LdSet<{
    "@id": string;
  }>;
}
