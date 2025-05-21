import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for contact
 * =============================================================================
 */

/**
 * SocialContact Type
 */
export interface SocialContact {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Defines the node as an Individual (from vcard) | Defines the node as a Person (from Schema.org) | Defines the node as a Person (from foaf)
   */
  type: LdSet<
    | {
        "@id": "Individual";
      }
    | {
        "@id": "Person";
      }
    | {
        "@id": "Person2";
      }
  >;
  /**
   * The formatted name of a person. Example: John Smith
   */
  fn: string;
  /**
   * The person's email.
   */
  hasEmail?: string;
  hasRating?: LdSet<HasRating>;
}

/**
 * HasRating Type
 */
export interface HasRating {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: {
    "@id": "Rating";
  };
  rated: number;
  skill:
    | {
        "@id": "ng:k:skills:programming:svelte";
      }
    | {
        "@id": "ng:k:skills:programming:nextjs";
      }
    | {
        "@id": "ng:k:skills:programming:react";
      }
    | {
        "@id": "ng:k:skills:programming:vuejs";
      }
    | {
        "@id": "ng:k:skills:programming:tailwind";
      }
    | {
        "@id": "ng:k:skills:programming:rdf";
      }
    | {
        "@id": "ng:k:skills:programming:rust";
      }
    | {
        "@id": "ng:k:skills:programming:yjs";
      }
    | {
        "@id": "ng:k:skills:programming:automerge";
      };
}
