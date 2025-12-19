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
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"did:ng:x:social:group#Group" | (IRI & {})>;
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
  tag: Set<IRI>;
  /**
   * Original IRI: did:ng:x:social:group#logoIRI
   */
  logoIRI?: IRI;
  /**
   * Original IRI: did:ng:x:social:group#hasMember
   */
  hasMember: Set<GroupMembership>;
  /**
   * Original IRI: did:ng:x:social:group#createdAt
   */
  createdAt?: string;
  /**
   * Original IRI: did:ng:x:social:group#post
   */
  post: Set<SocialPost>;
}

/**
 * SocialPost Type
 */
export interface SocialPost {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"did:ng:x:social:post#Post" | (IRI & {})>;
  /**
   * Original IRI: did:ng:x:social:post#author
   */
  author: Set<IRI>;
  /**
   * Original IRI: did:ng:x:social:post#createdAt
   */
  createdAt: string;
  /**
   * Original IRI: did:ng:x:social:post#tag
   */
  tag: Set<IRI>;
  /**
   * Original IRI: did:ng:x:social:post#description
   */
  description: string;
}

/**
 * GroupMembership Type
 */
export interface GroupMembership {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: did:ng:x:contact#contactId
   */
  contactId: IRI;
  /**
   * Original IRI: did:ng:x:contact#memberStatus
   */
  memberStatus:
    | "did:ng:k:contact:memberStatus#invited"
    | "did:ng:k:contact:memberStatus#joined"
    | "did:ng:k:contact:memberStatus#declined";
  /**
   * Original IRI: did:ng:x:contact#joinDate
   */
  joinDate?: string;
  /**
   * Original IRI: did:ng:x:contact#isAdmin
   */
  isAdmin?: boolean;
}
