import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for rcard
 * =============================================================================
 */

/**
 * RCardPermissionTriple Type
 */
export interface RCardPermissionTriple {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * First level property key from ContactLdSetProperties if differs from RCardPermission
   */
  firstLevel?: string;
  /**
   * Second level property or selector
   */
  secondLevel: string;
}

/**
 * RCardPermission Type
 */
export interface RCardPermission {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Instance object of the property
   */
  node?: {
    "@id": string;
  };
  /**
   * First level property key from ContactLdSetProperties
   */
  firstLevel: string;
  /**
   * Second level property or selector
   */
  secondLevel?: string;
  /**
   * Nested permission triples
   */
  triple?: LdSet<RCardPermissionTriple>;
  /**
   * Display zone for the property
   */
  zone:
    | {
        "@id": "top";
      }
    | {
        "@id": "bottom";
      }
    | {
        "@id": "middle";
      };
  /**
   * Display order within a zone
   */
  order?: number;
  /**
   * Whether permission is granted for this property
   */
  isPermissionGiven?: boolean;
  /**
   * Whether multiple values are allowed
   */
  isMultiple?: boolean;
  /**
   * Selector for the property
   */
  selector?: string;
}

/**
 * RCard Type
 */
export interface RCard {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Defines the node as an RCard
   */
  type: LdSet<{
    "@id": "Card";
  }>;
  /**
   * Unique identifier for the relationship category
   */
  cardId: string;
  /**
   * Display order
   */
  order?: number;
  /**
   * Permissions associated with this relationship category
   */
  permission?: LdSet<RCardPermission>;
}
