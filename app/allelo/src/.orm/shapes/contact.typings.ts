export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for contact
 * =============================================================================
 */

/**
 * SocialContact Type
 */
export interface SocialContact {
  readonly "@graph": IRI;
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
   * Original IRI: did:ng:x:contact#phoneNumber
   */
  phoneNumber?: Set<PhoneNumber>;
  /**
   * Original IRI: did:ng:x:contact#name
   */
  name?: Set<Name>;
  /**
   * Original IRI: did:ng:x:contact#email
   */
  email?: Set<Email>;
  /**
   * Original IRI: did:ng:x:contact#address
   */
  address?: Set<Address>;
  /**
   * Original IRI: did:ng:x:contact#organization
   */
  organization?: Set<Organization>;
  /**
   * Original IRI: did:ng:x:contact#photo
   */
  photo?: Set<Photo>;
  /**
   * Original IRI: did:ng:x:contact#coverPhoto
   */
  coverPhoto?: Set<CoverPhoto>;
  /**
   * Original IRI: did:ng:x:contact#url
   */
  url?: Set<Url>;
  /**
   * Original IRI: did:ng:x:contact#birthday
   */
  birthday?: Set<Birthday>;
  /**
   * Original IRI: did:ng:x:contact#biography
   */
  biography?: Set<Biography>;
  /**
   * Original IRI: did:ng:x:contact#event
   */
  event?: Set<Event>;
  /**
   * Original IRI: did:ng:x:contact#gender
   */
  gender?: Set<Gender>;
  /**
   * Original IRI: did:ng:x:contact#nickname
   */
  nickname?: Set<Nickname>;
  /**
   * Original IRI: did:ng:x:contact#occupation
   */
  occupation?: Set<Occupation>;
  /**
   * Original IRI: did:ng:x:contact#relation
   */
  relation?: Set<Relation>;
  /**
   * Original IRI: did:ng:x:contact#interest
   */
  interest?: Set<Interest>;
  /**
   * Original IRI: did:ng:x:contact#skill
   */
  skill?: Set<Skill>;
  /**
   * Original IRI: did:ng:x:contact#locationDescriptor
   */
  locationDescriptor?: Set<LocationDescriptor>;
  /**
   * Original IRI: did:ng:x:contact#locale
   */
  locale?: Set<Locale>;
  /**
   * Original IRI: did:ng:x:contact#account
   */
  account?: Set<Account>;
  /**
   * Original IRI: did:ng:x:contact#sipAddress
   */
  sipAddress?: Set<SipAddress>;
  /**
   * Original IRI: did:ng:x:contact#extId
   */
  extId?: Set<ExternalId>;
  /**
   * Original IRI: did:ng:x:contact#fileAs
   */
  fileAs?: Set<FileAs>;
  /**
   * Original IRI: did:ng:x:contact#calendarUrl
   */
  calendarUrl?: Set<CalendarUrl>;
  /**
   * Original IRI: did:ng:x:contact#clientData
   */
  clientData?: Set<ClientData>;
  /**
   * Original IRI: did:ng:x:contact#userDefined
   */
  userDefined?: Set<UserDefined>;
  /**
   * Original IRI: did:ng:x:contact#membership
   */
  membership?: Set<Membership>;
  /**
   * Original IRI: did:ng:x:contact#tag
   */
  tag?: Set<Tag>;
  /**
   * Original IRI: did:ng:x:contact#contactImportGroup
   */
  contactImportGroup?: Set<ContactImportGroup>;
  /**
   * Original IRI: did:ng:x:contact#internalGroup
   */
  internalGroup?: Set<InternalGroup>;
  /**
   * Original IRI: did:ng:x:contact#headline
   */
  headline?: Set<Headline>;
  /**
   * Original IRI: did:ng:x:contact#industry
   */
  industry?: Set<Industry>;
  /**
   * Original IRI: did:ng:x:contact#education
   */
  education?: Set<Education>;
  /**
   * Original IRI: did:ng:x:contact#language
   */
  language?: Set<Language>;
  /**
   * Original IRI: did:ng:x:contact#project
   */
  project?: Set<Project>;
  /**
   * Original IRI: did:ng:x:contact#publication
   */
  publication?: Set<Publication>;
  /**
   * Original IRI: did:ng:x:contact#naoStatus
   */
  naoStatus?: NaoStatus;
  /**
   * Original IRI: did:ng:x:contact#invitedAt
   */
  invitedAt?: InvitedAt;
  /**
   * Original IRI: did:ng:x:contact#createdAt
   */
  createdAt?: CreatedAt;
  /**
   * Original IRI: did:ng:x:contact#updatedAt
   */
  updatedAt?: UpdatedAt;
  /**
   * Original IRI: did:ng:x:contact#joinedAt
   */
  joinedAt?: JoinedAt;
  /**
   * Original IRI: did:ng:x:contact#mergedInto
   */
  mergedInto?: Set<IRI>;
  /**
   * Original IRI: did:ng:x:contact#mergedFrom
   */
  mergedFrom?: Set<IRI>;
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
 * PhoneNumber Type
 */
export interface PhoneNumber {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The canonicalized ITU-T E.164 form of the phone number
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The type of the phone number
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:contact:phoneNumber#home"
    | "did:ng:k:contact:phoneNumber#work"
    | "did:ng:k:contact:phoneNumber#mobile"
    | "did:ng:k:contact:phoneNumber#homeFax"
    | "did:ng:k:contact:phoneNumber#workFax"
    | "did:ng:k:contact:phoneNumber#otherFax"
    | "did:ng:k:contact:phoneNumber#pager"
    | "did:ng:k:contact:phoneNumber#workMobile"
    | "did:ng:k:contact:phoneNumber#workPager"
    | "did:ng:k:contact:phoneNumber#main"
    | "did:ng:k:contact:phoneNumber#googleVoice"
    | "did:ng:k:contact:phoneNumber#callback"
    | "did:ng:k:contact:phoneNumber#car"
    | "did:ng:k:contact:phoneNumber#companyMain"
    | "did:ng:k:contact:phoneNumber#isdn"
    | "did:ng:k:contact:phoneNumber#radio"
    | "did:ng:k:contact:phoneNumber#telex"
    | "did:ng:k:contact:phoneNumber#ttyTdd"
    | "did:ng:k:contact:phoneNumber#assistant"
    | "did:ng:k:contact:phoneNumber#mms"
    | "did:ng:k:contact:phoneNumber#other";
  /**
   * Source of the phone number data
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
   * Whether this is the preferred phone number
   *
   * Original IRI: did:ng:x:contact#preferred
   */
  preferred?: boolean;
}

/**
 * Name Type
 */
export interface Name {
  readonly "@graph": IRI;
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
 * Email Type
 */
export interface Email {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The email address
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The type of the email address
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:contact:type#home"
    | "did:ng:k:contact:type#work"
    | "did:ng:k:contact:type#mobile"
    | "did:ng:k:contact:type#custom"
    | "did:ng:k:contact:type#other";
  /**
   * The display name of the email
   *
   * Original IRI: did:ng:x:contact#displayName
   */
  displayName?: string;
  /**
   * Whether this is the preferred email address
   *
   * Original IRI: did:ng:x:contact#preferred
   */
  preferred?: boolean;
  /**
   * Source of the email data
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
  readonly "@graph": IRI;
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

/**
 * Organization Type
 */
export interface Organization {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The name of the organization
   *
   * Original IRI: did:ng:x:core#value
   */
  value?: string;
  /**
   * The phonetic name of the organization
   *
   * Original IRI: did:ng:x:contact#phoneticName
   */
  phoneticName?: string;
  /**
   * The phonetic name style
   *
   * Original IRI: did:ng:x:contact#phoneticNameStyle
   */
  phoneticNameStyle?: string;
  /**
   * The person's department at the organization
   *
   * Original IRI: did:ng:x:contact#department
   */
  department?: string;
  /**
   * The person's job title at the organization
   *
   * Original IRI: did:ng:x:contact#position
   */
  position?: string;
  /**
   * The person's job description at the organization
   *
   * Original IRI: did:ng:x:contact#jobDescription
   */
  jobDescription?: string;
  /**
   * The symbol associated with the organization
   *
   * Original IRI: did:ng:x:contact#symbol
   */
  symbol?: string;
  /**
   * The domain name associated with the organization
   *
   * Original IRI: did:ng:x:contact#domain
   */
  domain?: string;
  /**
   * The location of the organization office the person works at
   *
   * Original IRI: did:ng:x:contact#location
   */
  location?: string;
  /**
   * The person's cost center at the organization
   *
   * Original IRI: did:ng:x:contact#costCenter
   */
  costCenter?: string;
  /**
   * The person's full-time equivalent millipercent within the organization
   *
   * Original IRI: did:ng:x:contact#fullTimeEquivalentMillipercent
   */
  fullTimeEquivalentMillipercent?: number;
  /**
   * The type of the organization
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:org:type#business"
    | "did:ng:k:org:type#school"
    | "did:ng:k:org:type#work"
    | "did:ng:k:org:type#custom"
    | "did:ng:k:org:type#other";
  /**
   * The start date when the person joined the organization
   *
   * Original IRI: did:ng:x:core#startDate
   */
  startDate?: string;
  /**
   * The end date when the person left the organization
   *
   * Original IRI: did:ng:x:core#endDate
   */
  endDate?: string;
  /**
   * Whether this is the person's current organization
   *
   * Original IRI: did:ng:x:contact#current
   */
  current?: boolean;
  /**
   * Source of the organization data
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
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The URL of the photo
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The binary photo data
   *
   * Original IRI: did:ng:x:contact#data
   */
  data?: string;
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
 * CoverPhoto Type
 */
export interface CoverPhoto {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The URL of the cover photo
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * True if the cover photo is the default cover photo
   *
   * Original IRI: did:ng:x:contact#preferred
   */
  preferred?: boolean;
  /**
   * Source of the cover photo data
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
 * Url Type
 */
export interface Url {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The URL
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The type of the URL
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:link:type#homepage"
    | "did:ng:k:link:type#sourceCode"
    | "did:ng:k:link:type#blog"
    | "did:ng:k:link:type#documentation"
    | "did:ng:k:link:type#profile"
    | "did:ng:k:link:type#home"
    | "did:ng:k:link:type#work"
    | "did:ng:k:link:type#appInstall"
    | "did:ng:k:link:type#linkedin"
    | "did:ng:k:link:type#ftp"
    | "did:ng:k:link:type#custom"
    | "did:ng:k:link:type#reservations"
    | "did:ng:k:link:type#appInstallPage"
    | "did:ng:k:link:type#other";
  /**
   * Source of the URL data
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
   * Whether this is the preferred URL
   *
   * Original IRI: did:ng:x:contact#preferred
   */
  preferred?: boolean;
}

/**
 * Birthday Type
 */
export interface Birthday {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The structured date of the birthday
   *
   * Original IRI: did:ng:x:core#valueDate
   */
  valueDate: string;
  /**
   * Source of the birthday data
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
 * Biography Type
 */
export interface Biography {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The short biography
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The content type of the biography. Available types: TEXT_PLAIN, TEXT_HTML, CONTENT_TYPE_UNSPECIFIED
   *
   * Original IRI: did:ng:x:contact#contentType
   */
  contentType?: string;
  /**
   * Source of the biography data
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
 * Event Type
 */
export interface Event {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The date of the event
   *
   * Original IRI: did:ng:x:core#startDate
   */
  startDate: string;
  /**
   * The type of the event
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:event#anniversary"
    | "did:ng:k:event#party"
    | "did:ng:k:event#birthday"
    | "did:ng:k:event#custom"
    | "did:ng:k:event#other";
  /**
   * Source of the event data
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
 * Gender Type
 */
export interface Gender {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The gender for the person
   *
   * Original IRI: did:ng:x:core#valueIRI
   */
  valueIRI:
    | "did:ng:k:gender#male"
    | "did:ng:k:gender#female"
    | "did:ng:k:gender#other"
    | "did:ng:k:gender#unknown"
    | "did:ng:k:gender#none";
  /**
   * Free form text field for pronouns that should be used to address the person
   *
   * Original IRI: did:ng:x:contact#addressMeAs
   */
  addressMeAs?: string;
  /**
   * Source of the gender data
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
 * Nickname Type
 */
export interface Nickname {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The nickname
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The type of the nickname
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:contact:nickname#default"
    | "did:ng:k:contact:nickname#initials"
    | "did:ng:k:contact:nickname#otherName"
    | "did:ng:k:contact:nickname#shortName"
    | "did:ng:k:contact:nickname#maidenName"
    | "did:ng:k:contact:nickname#alternateName";
  /**
   * Source of the nickname data
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
 * Occupation Type
 */
export interface Occupation {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The occupation; for example, carpenter
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the occupation data
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
 * Relation Type
 */
export interface Relation {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The name of the other person this relation refers to
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The person's relation to the other person
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:humanRelationship#spouse"
    | "did:ng:k:humanRelationship#child"
    | "did:ng:k:humanRelationship#parent"
    | "did:ng:k:humanRelationship#sibling"
    | "did:ng:k:humanRelationship#friend"
    | "did:ng:k:humanRelationship#colleague"
    | "did:ng:k:humanRelationship#manager"
    | "did:ng:k:humanRelationship#assistant"
    | "did:ng:k:humanRelationship#brother"
    | "did:ng:k:humanRelationship#sister"
    | "did:ng:k:humanRelationship#father"
    | "did:ng:k:humanRelationship#mother"
    | "did:ng:k:humanRelationship#domesticPartner"
    | "did:ng:k:humanRelationship#partner"
    | "did:ng:k:humanRelationship#referredBy"
    | "did:ng:k:humanRelationship#relative"
    | "did:ng:k:humanRelationship#other";
  /**
   * Source of the relation data
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
 * Interest Type
 */
export interface Interest {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The interest; for example, stargazing
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the interest data
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
 * Skill Type
 */
export interface Skill {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The skill; for example, underwater basket weaving
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the skill data
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
 * LocationDescriptor Type
 */
export interface LocationDescriptor {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The free-form value of the location
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The type of the location. Available types: desk, grewUp
   *
   * Original IRI: did:ng:x:core#type
   */
  type?: string;
  /**
   * Whether the location is the current location
   *
   * Original IRI: did:ng:x:contact#current
   */
  current?: boolean;
  /**
   * The building identifier
   *
   * Original IRI: did:ng:x:contact#buildingId
   */
  buildingId?: string;
  /**
   * The floor name or number
   *
   * Original IRI: did:ng:x:contact#floor
   */
  floor?: string;
  /**
   * The floor section in floor_name
   *
   * Original IRI: did:ng:x:contact#floorSection
   */
  floorSection?: string;
  /**
   * The individual desk location
   *
   * Original IRI: did:ng:x:contact#deskCode
   */
  deskCode?: string;
  /**
   * Source of the location data
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
 * Locale Type
 */
export interface Locale {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The well-formed IETF BCP 47 language tag representing the locale
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the locale data
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
 * Account Type
 */
export interface Account {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The user name used in the IM client
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The type of the IM client
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:contact:type#home"
    | "did:ng:k:contact:type#work"
    | "did:ng:k:contact:type#other";
  /**
   * The protocol of the IM client. Available protocols: aim, msn, yahoo, skype, qq, googleTalk, icq, jabber, netMeeting
   *
   * Original IRI: did:ng:x:contact#protocol
   */
  protocol?: string;
  /**
   * The server for the IM client
   *
   * Original IRI: did:ng:x:contact#server
   */
  server?: string;
  /**
   * Source of the chat client data
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
   * Whether this is the preferred email address
   *
   * Original IRI: did:ng:x:contact#preferred
   */
  preferred?: boolean;
}

/**
 * SipAddress Type
 */
export interface SipAddress {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The SIP address in the RFC 3261 19.1 SIP URI format
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The type of the SIP address
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:contact:sip#home"
    | "did:ng:k:contact:sip#work"
    | "did:ng:k:contact:sip#mobile"
    | "did:ng:k:contact:sip#other";
  /**
   * Source of the SIP address data
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
 * ExternalId Type
 */
export interface ExternalId {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The value of the external ID
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The type of the external ID. Available types: account, customer, network, organization
   *
   * Original IRI: did:ng:x:core#type
   */
  type?: string;
  /**
   * Source of the external ID data
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
 * FileAs Type
 */
export interface FileAs {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The file-as value
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the file-as data
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
 * CalendarUrl Type
 */
export interface CalendarUrl {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The calendar URL
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * The type of the calendar URL
   *
   * Original IRI: did:ng:x:core#type
   */
  type?:
    | "did:ng:k:calendar:type#home"
    | "did:ng:k:calendar:type#availability"
    | "did:ng:k:calendar:type#work";
  /**
   * Source of the calendar URL data
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
 * ClientData Type
 */
export interface ClientData {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The client specified key of the client data
   *
   * Original IRI: did:ng:x:contact#key
   */
  key: string;
  /**
   * The client specified value of the client data
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the client data
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
 * UserDefined Type
 */
export interface UserDefined {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The end user specified key of the user defined data
   *
   * Original IRI: did:ng:x:contact#key
   */
  key: string;
  /**
   * The end user specified value of the user defined data
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the user defined data
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
 * Membership Type
 */
export interface Membership {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Contact group resource name membership
   *
   * Original IRI: did:ng:x:contact#contactGroupResourceNameMembership
   */
  contactGroupResourceNameMembership?: string;
  /**
   * Whether in viewer domain membership
   *
   * Original IRI: did:ng:x:contact#inViewerDomainMembership
   */
  inViewerDomainMembership?: boolean;
  /**
   * Source of the membership data
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
 * Tag Type
 */
export interface Tag {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * The value of the miscellaneous keyword/tag
   *
   * Original IRI: did:ng:x:core#valueIRI
   */
  valueIRI:
    | "did:ng:k:contact:tag#ai"
    | "did:ng:k:contact:tag#technology"
    | "did:ng:k:contact:tag#leadership"
    | "did:ng:k:contact:tag#design"
    | "did:ng:k:contact:tag#creative"
    | "did:ng:k:contact:tag#branding"
    | "did:ng:k:contact:tag#humaneTech"
    | "did:ng:k:contact:tag#ethics"
    | "did:ng:k:contact:tag#networking"
    | "did:ng:k:contact:tag#golang"
    | "did:ng:k:contact:tag#infrastructure"
    | "did:ng:k:contact:tag#blockchain"
    | "did:ng:k:contact:tag#protocols"
    | "did:ng:k:contact:tag#p2p"
    | "did:ng:k:contact:tag#entrepreneur"
    | "did:ng:k:contact:tag#climate"
    | "did:ng:k:contact:tag#agriculture"
    | "did:ng:k:contact:tag#socialImpact"
    | "did:ng:k:contact:tag#investing"
    | "did:ng:k:contact:tag#ventures"
    | "did:ng:k:contact:tag#identity"
    | "did:ng:k:contact:tag#trust"
    | "did:ng:k:contact:tag#digitalCredentials"
    | "did:ng:k:contact:tag#crypto"
    | "did:ng:k:contact:tag#organizations"
    | "did:ng:k:contact:tag#transformation"
    | "did:ng:k:contact:tag#author"
    | "did:ng:k:contact:tag#cognition"
    | "did:ng:k:contact:tag#research"
    | "did:ng:k:contact:tag#futurism"
    | "did:ng:k:contact:tag#writing"
    | "did:ng:k:contact:tag#ventureCapital"
    | "did:ng:k:contact:tag#deepTech"
    | "did:ng:k:contact:tag#startups"
    | "did:ng:k:contact:tag#sustainability"
    | "did:ng:k:contact:tag#environment"
    | "did:ng:k:contact:tag#healthcare"
    | "did:ng:k:contact:tag#policy"
    | "did:ng:k:contact:tag#medicare"
    | "did:ng:k:contact:tag#education"
    | "did:ng:k:contact:tag#careerDevelopment"
    | "did:ng:k:contact:tag#openai"
    | "did:ng:k:contact:tag#decentralized"
    | "did:ng:k:contact:tag#database"
    | "did:ng:k:contact:tag#forestry"
    | "did:ng:k:contact:tag#biotech"
    | "did:ng:k:contact:tag#mrna"
    | "did:ng:k:contact:tag#vaccines"
    | "did:ng:k:contact:tag#fintech"
    | "did:ng:k:contact:tag#product"
    | "did:ng:k:contact:tag#ux";
  /**
   * The miscellaneous keyword type. Available types: OUTLOOK_BILLING_INFORMATION, OUTLOOK_DIRECTORY_SERVER, OUTLOOK_KEYWORD, OUTLOOK_MILEAGE, OUTLOOK_PRIORITY, OUTLOOK_SENSITIVITY, OUTLOOK_SUBJECT, OUTLOOK_USER, HOME, WORK, OTHER
   *
   * Original IRI: did:ng:x:core#type
   */
  type?: string;
  /**
   * Source of the tag data
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
 * ContactImportGroup Type
 */
export interface ContactImportGroup {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * ID of the import group
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Name of the import group
   *
   * Original IRI: did:ng:x:contact#name
   */
  name?: string;
  /**
   * Source of the group data
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
 * InternalGroup Type
 */
export interface InternalGroup {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Mostly to preserve current mock UI group id
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the internal group data
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
 * NaoStatus Type
 */
export interface NaoStatus {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * NAO status value
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the status data
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
 * InvitedAt Type
 */
export interface InvitedAt {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * When the contact was invited
   *
   * Original IRI: did:ng:x:core#valueDateTime
   */
  valueDateTime: string;
  /**
   * Source of the invited date
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
 * CreatedAt Type
 */
export interface CreatedAt {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * When the contact was created
   *
   * Original IRI: did:ng:x:core#valueDateTime
   */
  valueDateTime: string;
  /**
   * Source of the creation date
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
 * UpdatedAt Type
 */
export interface UpdatedAt {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * When the contact was last updated
   *
   * Original IRI: did:ng:x:core#valueDateTime
   */
  valueDateTime: string;
  /**
   * Source of the update date
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
 * JoinedAt Type
 */
export interface JoinedAt {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * When the contact joined
   *
   * Original IRI: did:ng:x:core#valueDateTime
   */
  valueDateTime: string;
  /**
   * Source of the join date
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
 * Headline Type
 */
export interface Headline {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Headline(position at orgName) in Profile
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the headline data
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
 * Industry Type
 */
export interface Industry {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Industry in which contact works
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Source of the industry data
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
 * Education Type
 */
export interface Education {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * School name
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Start date of education
   *
   * Original IRI: did:ng:x:core#startDate
   */
  startDate?: string;
  /**
   * End date of education
   *
   * Original IRI: did:ng:x:core#endDate
   */
  endDate?: string;
  /**
   * Education notes
   *
   * Original IRI: did:ng:x:contact#notes
   */
  notes?: string;
  /**
   * Degree name
   *
   * Original IRI: did:ng:x:contact#degreeName
   */
  degreeName?: string;
  /**
   * Education activities
   *
   * Original IRI: did:ng:x:contact#activities
   */
  activities?: string;
  /**
   * Source of the education data
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
 * Language Type
 */
export interface Language {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Language name as IRI
   *
   * Original IRI: did:ng:x:core#valueIRI
   */
  valueIRI: IRI;
  /**
   * Language proficiency
   *
   * Original IRI: did:ng:x:contact#proficiency
   */
  proficiency?:
    | "did:ng:k:skills:language:proficiency#elementary"
    | "did:ng:k:skills:language:proficiency#limitedWork"
    | "did:ng:k:skills:language:proficiency#professionalWork"
    | "did:ng:k:skills:language:proficiency#fullWork"
    | "did:ng:k:skills:language:proficiency#bilingual";
  /**
   * Source of the language data
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
 * Project Type
 */
export interface Project {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Title of project
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Project description
   *
   * Original IRI: did:ng:x:core#description
   */
  description?: string;
  /**
   * Project URL
   *
   * Original IRI: did:ng:x:core#url
   */
  url?: string;
  /**
   * Project start date
   *
   * Original IRI: did:ng:x:core#startDate
   */
  startDate?: string;
  /**
   * Project end date
   *
   * Original IRI: did:ng:x:core#endDate
   */
  endDate?: string;
  /**
   * Source of the project data
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
 * Publication Type
 */
export interface Publication {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * Title of publication
   *
   * Original IRI: did:ng:x:core#value
   */
  value: string;
  /**
   * Publication date
   *
   * Original IRI: did:ng:x:core#publishDate
   */
  publishDate?: string;
  /**
   * Publication description
   *
   * Original IRI: did:ng:x:core#description
   */
  description?: string;
  /**
   * Publisher name
   *
   * Original IRI: did:ng:x:contact#publisher
   */
  publisher?: string;
  /**
   * Publication URL
   *
   * Original IRI: did:ng:x:core#url
   */
  url?: string;
  /**
   * Source of the publication data
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
