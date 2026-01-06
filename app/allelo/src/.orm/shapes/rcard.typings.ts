export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for rcard
 * =============================================================================
 */

/**
 * RCardPermissionTriple Type
 */
export interface RCardPermissionTriple {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * First level property key from ContactLdSetProperties if differs from RCardPermission
   *
   * Original IRI: did:ng:x:social:rcard:permission#firstLevel
   */
  firstLevel?: string;
  /**
   * Second level property or selector
   *
   * Original IRI: did:ng:x:social:rcard:permission#secondLevel
   */
  secondLevel: string;
}

/**
 * RCardPermission Type
 */
export interface RCardPermission {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Instance object of the property
   *
   * Original IRI: did:ng:x:social:rcard:permission#node
   */
  node?: IRI;
  /**
   * First level property key from ContactLdSetProperties
   *
   * Original IRI: did:ng:x:social:rcard:permission#firstLevel
   */
  firstLevel: string;
  /**
   * Second level property or selector
   *
   * Original IRI: did:ng:x:social:rcard:permission#secondLevel
   */
  secondLevel?: string;
  /**
   * Nested permission triples
   *
   * Original IRI: did:ng:x:social:rcard:permission#triple
   */
  triple?: Set<RCardPermissionTriple>;
  /**
   * Display zone for the property
   *
   * Original IRI: did:ng:x:social:rcard:permission#zone
   */
  zone:
    | "did:ng:k:social:rcard:permission:zone#top"
    | "did:ng:k:social:rcard:permission:zone#bottom"
    | "did:ng:k:social:rcard:permission:zone#middle";
  /**
   * Display order within a zone
   *
   * Original IRI: did:ng:x:social:rcard#order
   */
  order?: number;
  /**
   * Whether permission is granted for this property
   *
   * Original IRI: did:ng:x:social:rcard:permission#isPermissionGiven
   */
  isPermissionGiven?: boolean;
  /**
   * Whether multiple values are allowed
   *
   * Original IRI: did:ng:x:social:rcard:permission#isMultiple
   */
  isMultiple?: boolean;
  /**
   * Selector for the property
   *
   * Original IRI: did:ng:x:social:rcard:permission#selector
   */
  selector?: string;
}

/**
 * RCard Type
 */
export interface RCard {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Defines the node as an RCard
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"did:ng:x:social:rcard#Card" | (IRI & {})>;
  /**
   * Unique identifier for the relationship category
   *
   * Original IRI: did:ng:x:social:rcard#cardId
   */
  cardId: string;
  /**
   * Display order
   *
   * Original IRI: did:ng:x:social:rcard#order
   */
  order?: number;
  /**
   * Permissions associated with this relationship category
   *
   * Original IRI: did:ng:x:social:rcard:permission#permission
   */
  permission?: Set<RCardPermission>;
}
