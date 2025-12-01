export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for group
 * =============================================================================
 */

/**
 * SocialGroup Type
 */
export interface SocialGroup {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "did:ng:x:social:group#Group";
  /**
   * Original IRI: did:ng:x:social:group#title
   */
  title: string;
  /**
   * Original IRI: did:ng:x:social:group#description
   */
  description?: string;
  /**
   * Original IRI: did:ng:x:social:group#tag
   */
  tag?: Set<IRI>;
  /**
   * Original IRI: did:ng:x:social:group#logoIRI
   */
  logoIRI?: IRI;
  /**
   * Original IRI: did:ng:x:social:group#hasMember
   */
  hasMember?: Set<IRI>;
  /**
   * Original IRI: did:ng:x:social:group#hasAdmin
   */
  hasAdmin?: Set<IRI>;
  /**
   * Original IRI: did:ng:x:social:group#createdAt
   */
  createdAt?: string;
  /**
   * Original IRI: did:ng:x:social:group#post
   */
  post?: Set<SocialPost>;
}

/**
 * SocialPost Type
 */
export interface SocialPost {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "did:ng:x:social:post#Post";
  /**
   * Original IRI: did:ng:x:social:post#author
   */
  author?: Set<IRI>;
  /**
   * Original IRI: did:ng:x:social:post#createdAt
   */
  createdAt: string;
  /**
   * Original IRI: did:ng:x:social:post#tag
   */
  tag?: Set<IRI>;
  /**
   * Original IRI: did:ng:x:social:post#description
   */
  description: string;
}
