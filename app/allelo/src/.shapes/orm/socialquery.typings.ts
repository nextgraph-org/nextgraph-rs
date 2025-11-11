export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for socialquery
 * =============================================================================
 */

/**
 * SocialQuery Type
 */
export interface SocialQuery {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "did:ng:x:class#SocialQuery";
  /**
   * Original IRI: did:ng:x:ng#social_query_sparql
   */
  social_query_sparql?: string;
  /**
   * Original IRI: did:ng:x:ng#social_query_forwarder
   */
  social_query_forwarder?: IRI;
  /**
   * Original IRI: did:ng:x:ng#social_query_ended
   */
  social_query_ended?: string;
}
