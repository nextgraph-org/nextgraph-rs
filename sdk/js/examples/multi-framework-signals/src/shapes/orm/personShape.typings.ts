export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for personShape
 * =============================================================================
 */

/**
 * Person Type
 */
export interface Person {
  id: IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  type: string;
  /**
   * Original IRI: http://example.org/name
   */
  name: string;
  /**
   * Original IRI: http://example.org/address
   */
  address: {
    id: IRI;
    /**
     * Original IRI: http://example.org/street
     */
    street: string;
    /**
     * Original IRI: http://example.org/houseNumber
     */
    houseNumber: string;
  };
  /**
   * Original IRI: http://example.org/hasChildren
   */
  hasChildren: boolean;
  /**
   * Original IRI: http://example.org/numberOfHouses
   */
  numberOfHouses: number;
}
