import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for container
 * =============================================================================
 */

/**
 * Container Type
 */
export interface Container {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * A container
   */
  type?: LdSet<
    | {
        "@id": "Container";
      }
    | {
        "@id": "Resource";
      }
  >;
  /**
   * Date modified
   */
  modified?: string;
  /**
   * Defines a Resource
   */
  contains?: LdSet<{
    "@id": string;
  }>;
  /**
   * ?
   */
  mtime?: number;
  /**
   * size of this container
   */
  size?: number;
}
