export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for shortcontact
 * =============================================================================
 */

/**
 * ShortSocialContact Type
 */
export interface ShortSocialContact {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Defines the node as an Individual (from vcard)
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<
    "http://www.w3.org/2006/vcard/ns#Individual" | "did:ng:x:contact:class#Me"
  >;
  /**
   * Original IRI: did:ng:x:contact#name
   */
  name?: Set<Name>;
  /**
   * Original IRI: did:ng:x:contact#address
   */
  address?: Set<Address>;
  /**
   * Original IRI: did:ng:x:contact#photo
   */
  photo?: Set<Photo>;
  /**
   * Original IRI: did:ng:x:contact#naoStatus
   */
  naoStatus?: string;
  /**
   * Original IRI: did:ng:x:contact#centralityScore
   */
  centralityScore?: number;
  /**
   * Original IRI: did:ng:x:contact#mostRecentInteraction
   */
  mostRecentInteraction?: string;
}

/**
 * Name Type
 */
export interface Name {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * The display name
   *
   * Original IRI: did:ng:x:core#value
   */
  value?: string;
  /**
   * The display name with the last name first
   *
   * Original IRI: did:ng:x:contact#displayNameLastFirst
   */
  displayNameLastFirst?: string;
  /**
   * The free form name value
   *
   * Original IRI: did:ng:x:contact#unstructuredName
   */
  unstructuredName?: string;
  /**
   * The family name
   *
   * Original IRI: did:ng:x:contact#familyName
   */
  familyName?: string;
  /**
   * The given name
   *
   * Original IRI: did:ng:x:contact#firstName
   */
  firstName?: string;
  /**
   * The maiden name
   *
   * Original IRI: did:ng:x:contact#maidenName
   */
  maidenName?: string;
  /**
   * The middle name(s)
   *
   * Original IRI: did:ng:x:contact#middleName
   */
  middleName?: string;
  /**
   * The honorific prefixes, such as Mrs. or Dr.
   *
   * Original IRI: did:ng:x:contact#honorificPrefix
   */
  honorificPrefix?: string;
  /**
   * The honorific suffixes, such as Jr.
   *
   * Original IRI: did:ng:x:contact#honorificSuffix
   */
  honorificSuffix?: string;
  /**
   * The full name spelled as it sounds
   *
   * Original IRI: did:ng:x:contact#phoneticFullName
   */
  phoneticFullName?: string;
  /**
   * The family name spelled as it sounds
   *
   * Original IRI: did:ng:x:contact#phoneticFamilyName
   */
  phoneticFamilyName?: string;
  /**
   * The given name spelled as it sounds
   *
   * Original IRI: did:ng:x:contact#phoneticGivenName
   */
  phoneticGivenName?: string;
  /**
   * The middle name(s) spelled as they sound
   *
   * Original IRI: did:ng:x:contact#phoneticMiddleName
   */
  phoneticMiddleName?: string;
  /**
   * The honorific prefixes spelled as they sound
   *
   * Original IRI: did:ng:x:contact#phoneticHonorificPrefix
   */
  phoneticHonorificPrefix?: string;
  /**
   * The honorific suffixes spelled as they sound
   *
   * Original IRI: did:ng:x:contact#phoneticHonorificSuffix
   */
  phoneticHonorificSuffix?: string;
  /**
   * Source of the name data
   *
   * Original IRI: did:ng:x:core#source
   */
  source?: string;
  /**
   * Whether this is main
   *
   * Original IRI: did:ng:x:core#selected
   */
  selected?: boolean;
}

/**
 * Photo Type
 */
export interface Photo {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * The URL of the photo
   *
   * Original IRI: did:ng:x:core#photoUrl
   */
  photoUrl?: string;
  /**
   * The IRI of blob
   *
   * Original IRI: did:ng:x:core#photoIRI
   */
  photoIRI: IRI;
  /**
   * True if the photo is a default photo
   *
   * Original IRI: did:ng:x:contact#preferred
   */
  preferred?: boolean;
  /**
   * Source of the photo data
   *
   * Original IRI: did:ng:x:core#source
   */
  source?: string;
  /**
   * Whether this is hidden from list
   *
   * Original IRI: did:ng:x:core#hidden
   */
  hidden?: boolean;
}

/**
 * Address Type
 */
export interface Address {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * The unstructured value of the address
   *
   * Original IRI: did:ng:x:core#value
   */
  value?: string;
  /**
   * The type of the address
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:contact:type#home"
    | "did:ng:k:contact:type#work"
    | "did:ng:k:contact:type#custom"
    | "did:ng:k:contact:type#other";
  /**
   * Latitude of address
   *
   * Original IRI: did:ng:x:contact#coordLat
   */
  coordLat?: number;
  /**
   * Longitude of address
   *
   * Original IRI: did:ng:x:contact#coordLng
   */
  coordLng?: number;
  /**
   * The P.O. box of the address
   *
   * Original IRI: did:ng:x:contact#poBox
   */
  poBox?: string;
  /**
   * The street address
   *
   * Original IRI: did:ng:x:contact#streetAddress
   */
  streetAddress?: string;
  /**
   * The extended address; for example, the apartment number
   *
   * Original IRI: did:ng:x:contact#extendedAddress
   */
  extendedAddress?: string;
  /**
   * The city of the address
   *
   * Original IRI: did:ng:x:contact#city
   */
  city?: string;
  /**
   * The region of the address; for example, the state or province
   *
   * Original IRI: did:ng:x:contact#region
   */
  region?: string;
  /**
   * The postal code of the address
   *
   * Original IRI: did:ng:x:contact#postalCode
   */
  postalCode?: string;
  /**
   * The country of the address
   *
   * Original IRI: did:ng:x:contact#country
   */
  country?: string;
  /**
   * The ISO 3166-1 alpha-2 country code
   *
   * Original IRI: did:ng:x:contact#countryCode
   */
  countryCode?: string;
  /**
   * Source of the address data
   *
   * Original IRI: did:ng:x:core#source
   */
  source?: string;
  /**
   * Whether this is hidden from list
   *
   * Original IRI: did:ng:x:core#hidden
   */
  hidden?: boolean;
  /**
   * Whether this is the preferred address
   *
   * Original IRI: did:ng:x:contact#preferred
   */
  preferred?: boolean;
}
