import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for group
 * =============================================================================
 */

/**
 * SocialGroup Type
 */
export interface SocialGroup {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "Group";
  }>;
  title: string;
  description?: string;
  tag?: LdSet<{
    "@id": string;
  }>;
  logoIRI?: {
    "@id": string;
  };
  hasMember?: LdSet<{
    "@id": string;
  }>;
  hasAdmin?: LdSet<{
    "@id": string;
  }>;
  createdAt?: string;
  post?: LdSet<SocialPost>;
}

/**
 * SocialPost Type
 */
export interface SocialPost {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "Post";
  }>;
  author?: LdSet<{
    "@id": string;
  }>;
  createdAt: string;
  tag?: LdSet<{
    "@id": string;
  }>;
  description: string;
}
