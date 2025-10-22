export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for basic
 * =============================================================================
 */

/**
 * Basic Type
 */
export interface Basic {
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": string;
  /**
   * Original IRI: http://example.org/basicString
   */
  basicString: string;
}
