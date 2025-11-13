export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for testShape
 * =============================================================================
 */

/**
 * TestObject Type
 */
export interface TestObject {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "http://example.org/TestObject";
  /**
   * Original IRI: http://example.org/stringValue
   */
  stringValue: string;
  /**
   * Original IRI: http://example.org/numValue
   */
  numValue: number;
  /**
   * Original IRI: http://example.org/boolValue
   */
  boolValue: boolean;
  /**
   * Original IRI: http://example.org/arrayValue
   */
  arrayValue?: Set<number>;
  /**
   * Original IRI: http://example.org/objectValue
   */
  objectValue: {
    readonly "@id": IRI;
    readonly "@graph": IRI;
    /**
     * Original IRI: http://example.org/nestedString
     */
    nestedString: string;
    /**
     * Original IRI: http://example.org/nestedNum
     */
    nestedNum: number;
    /**
     * Original IRI: http://example.org/nestedArray
     */
    nestedArray?: Set<number>;
  };
  /**
   * Original IRI: http://example.org/anotherObject
   */
  anotherObject?: Set<{
    readonly "@id": IRI;
    readonly "@graph": IRI;
    /**
     * Original IRI: http://example.org/prop1
     */
    prop1: string;
    /**
     * Original IRI: http://example.org/prop2
     */
    prop2: number;
  }>;
  /**
   * Original IRI: http://example.org/numOrStr
   */
  numOrStr: string | number;
  /**
   * Original IRI: http://example.org/lit1Or2
   */
  lit1Or2: string | string;
}
