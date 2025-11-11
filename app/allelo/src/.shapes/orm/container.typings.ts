export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for container
 * =============================================================================
 */

/**
 * Container Type
 */
export interface Container {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * A container
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type"?: Set<
    "http://www.w3.org/ns/ldp#Container" | "http://www.w3.org/ns/ldp#Resource"
  >;
  /**
   * Date modified
   *
   * Original IRI: http://purl.org/dc/terms/modified
   */
  modified?: string;
  /**
   * Defines a Resource
   *
   * Original IRI: http://www.w3.org/ns/ldp#contains
   */
  contains?: Set<IRI>;
  /**
   * ?
   *
   * Original IRI: http://www.w3.org/ns/posix/stat#mtime
   */
  mtime?: number;
  /**
   * size of this container
   *
   * Original IRI: http://www.w3.org/ns/posix/stat#size
   */
  size?: number;
}
