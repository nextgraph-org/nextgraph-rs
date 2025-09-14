import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for solid
 * =============================================================================
 */

/**
 * Container Type
 */
export interface Container {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * A container on a Solid server
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
   * Defines a Solid Resource
   */
  contains?: LdSet<Resource>;
  /**
   * ?
   */
  mtime?: number;
  /**
   * size of this container
   */
  size?: number;
}

/**
 * Resource Type
 */
export interface Resource {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Any resource on a Solid server
   */
  type?: LdSet<
    | {
        "@id": "Resource";
      }
    | {
        "@id": "Resource2";
      }
  >;
  /**
   * Date modified
   */
  modified?: string;
  /**
   * ?
   */
  mtime?: number;
  /**
   * size of this container
   */
  size?: number;
}

/**
 * ProfileWithStorage Type
 */
export interface ProfileWithStorage {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  storage?: LdSet<{
    "@id": string;
  }>;
}
