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
  fn?: string;
  /**
   * The person's email.
   */
  hasEmail?: string;
}
