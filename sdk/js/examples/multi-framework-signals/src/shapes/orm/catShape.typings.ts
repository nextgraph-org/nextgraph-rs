export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for catShape
 * =============================================================================
 */

/**
 * Cat Type
 */
export interface Cat {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "http://example.org/Cat";
  /**
   * Original IRI: http://example.org/name
   */
  name: string;
  /**
   * Original IRI: http://example.org/age
   */
  age: number;
  /**
   * Original IRI: http://example.org/numberOfHomes
   */
  numberOfHomes: number;
  /**
   * Original IRI: http://example.org/address
   */
  address: {
    readonly "@id": IRI;
    readonly "@graph": IRI;
    /**
     * Original IRI: http://example.org/street
     */
    street: string;
    /**
     * Original IRI: http://example.org/houseNumber
     */
    houseNumber: string;
    /**
     * Original IRI: http://example.org/floor
     */
    floor: number;
  };
}
