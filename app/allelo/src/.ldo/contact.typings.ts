import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for contact
 * =============================================================================
 */

/**
 * SocialContact Type
 */
export interface SocialContact {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Defines the node as an Individual (from vcard) | Defines the node as a Person (from Schema.org) | Defines the node as a Person (from foaf)
   */
  type: LdSet<
    | {
        "@id": "Individual";
      }
    | {
        "@id": "Person";
      }
    | {
        "@id": "Person2";
      }
  >;
  phoneNumber?: LdSet<PhoneNumber>;
  name?: LdSet<Name>;
  email?: LdSet<Email>;
  address?: LdSet<Address>;
  organization?: LdSet<Organization>;
  photo?: LdSet<Photo>;
  coverPhoto?: LdSet<CoverPhoto>;
  url?: LdSet<Url>;
  birthday?: LdSet<Birthday>;
  biography?: LdSet<Biography>;
  event?: LdSet<Event>;
  gender?: LdSet<Gender>;
  nickname?: LdSet<Nickname>;
  occupation?: LdSet<Occupation>;
  relation?: LdSet<Relation>;
  interest?: LdSet<Interest>;
  skill?: LdSet<Skill>;
  locationDescriptor?: LdSet<LocationDescriptor>;
  locale?: LdSet<Locale>;
  account?: LdSet<Account>;
  sipAddress?: LdSet<SipAddress>;
  extId?: LdSet<ExternalId>;
  fileAs?: LdSet<FileAs>;
  calendarUrl?: LdSet<CalendarUrl>;
  clientData?: LdSet<ClientData>;
  userDefined?: LdSet<UserDefined>;
  membership?: LdSet<Membership>;
  tag?: LdSet<Tag>;
  contactImportGroup?: LdSet<ContactImportGroup>;
  internalGroup?: LdSet<InternalGroup>;
  headline?: LdSet<Headline>;
  industry?: LdSet<Industry>;
  education?: LdSet<Education>;
  language?: LdSet<Language>;
  project?: LdSet<Project>;
  publication?: LdSet<Publication>;
  naoStatus?: NaoStatus;
  invitedAt?: InvitedAt;
  createdAt?: CreatedAt;
  updatedAt?: UpdatedAt;
  joinedAt?: JoinedAt;
  mergedInto?: LdSet<SocialContact>;
  mergedFrom?: LdSet<SocialContact>;
}

/**
 * PhoneNumber Type
 */
export interface PhoneNumber {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The canonicalized ITU-T E.164 form of the phone number
   */
  value: string;
  /**
   * The type of the phone number
   */
  type2?:
    | {
        "@id": "home";
      }
    | {
        "@id": "work";
      }
    | {
        "@id": "mobile";
      }
    | {
        "@id": "homeFax";
      }
    | {
        "@id": "workFax";
      }
    | {
        "@id": "otherFax";
      }
    | {
        "@id": "pager";
      }
    | {
        "@id": "workMobile";
      }
    | {
        "@id": "workPager";
      }
    | {
        "@id": "main";
      }
    | {
        "@id": "googleVoice";
      }
    | {
        "@id": "callback";
      }
    | {
        "@id": "car";
      }
    | {
        "@id": "companyMain";
      }
    | {
        "@id": "isdn";
      }
    | {
        "@id": "radio";
      }
    | {
        "@id": "telex";
      }
    | {
        "@id": "ttyTdd";
      }
    | {
        "@id": "assistant";
      }
    | {
        "@id": "mms";
      }
    | {
        "@id": "other";
      };
  /**
   * Source of the phone number data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
  /**
   * Whether this is the preferred phone number
   */
  preferred?: boolean;
}

/**
 * Name Type
 */
export interface Name {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The display name
   */
  value?: string;
  /**
   * The display name with the last name first
   */
  displayNameLastFirst?: string;
  /**
   * The free form name value
   */
  unstructuredName?: string;
  /**
   * The family name
   */
  familyName?: string;
  /**
   * The given name
   */
  firstName?: string;
  /**
   * The maiden name
   */
  maidenName?: string;
  /**
   * The middle name(s)
   */
  middleName?: string;
  /**
   * The honorific prefixes, such as Mrs. or Dr.
   */
  honorificPrefix?: string;
  /**
   * The honorific suffixes, such as Jr.
   */
  honorificSuffix?: string;
  /**
   * The full name spelled as it sounds
   */
  phoneticFullName?: string;
  /**
   * The family name spelled as it sounds
   */
  phoneticFamilyName?: string;
  /**
   * The given name spelled as it sounds
   */
  phoneticGivenName?: string;
  /**
   * The middle name(s) spelled as they sound
   */
  phoneticMiddleName?: string;
  /**
   * The honorific prefixes spelled as they sound
   */
  phoneticHonorificPrefix?: string;
  /**
   * The honorific suffixes spelled as they sound
   */
  phoneticHonorificSuffix?: string;
  /**
   * Source of the name data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Email Type
 */
export interface Email {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The email address
   */
  value: string;
  /**
   * The type of the email address
   */
  type2?:
    | {
        "@id": "home2";
      }
    | {
        "@id": "work2";
      }
    | {
        "@id": "mobile2";
      }
    | {
        "@id": "custom";
      }
    | {
        "@id": "other2";
      };
  /**
   * The display name of the email
   */
  displayName?: string;
  /**
   * Whether this is the preferred email address
   */
  preferred?: boolean;
  /**
   * Source of the email data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Address Type
 */
export interface Address {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The unstructured value of the address
   */
  value?: string;
  /**
   * The type of the address
   */
  type2?:
    | {
        "@id": "home2";
      }
    | {
        "@id": "work2";
      }
    | {
        "@id": "custom";
      }
    | {
        "@id": "other2";
      };
  /**
   * Latitude of address
   */
  coordLat?: number;
  /**
   * Longitude of address
   */
  coordLng?: number;
  /**
   * The P.O. box of the address
   */
  poBox?: string;
  /**
   * The street address
   */
  streetAddress?: string;
  /**
   * The extended address; for example, the apartment number
   */
  extendedAddress?: string;
  /**
   * The city of the address
   */
  city?: string;
  /**
   * The region of the address; for example, the state or province
   */
  region?: string;
  /**
   * The postal code of the address
   */
  postalCode?: string;
  /**
   * The country of the address
   */
  country?: string;
  /**
   * The ISO 3166-1 alpha-2 country code
   */
  countryCode?: string;
  /**
   * Source of the address data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
  /**
   * Whether this is the preferred address
   */
  preferred?: boolean;
}

/**
 * Organization Type
 */
export interface Organization {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The name of the organization
   */
  value?: string;
  /**
   * The phonetic name of the organization
   */
  phoneticName?: string;
  /**
   * The phonetic name style
   */
  phoneticNameStyle?: string;
  /**
   * The person's department at the organization
   */
  department?: string;
  /**
   * The person's job title at the organization
   */
  position?: string;
  /**
   * The person's job description at the organization
   */
  jobDescription?: string;
  /**
   * The symbol associated with the organization
   */
  symbol?: string;
  /**
   * The domain name associated with the organization
   */
  domain?: string;
  /**
   * The location of the organization office the person works at
   */
  location?: string;
  /**
   * The person's cost center at the organization
   */
  costCenter?: string;
  /**
   * The person's full-time equivalent millipercent within the organization
   */
  fullTimeEquivalentMillipercent?: number;
  /**
   * The type of the organization
   */
  type2?:
    | {
        "@id": "business";
      }
    | {
        "@id": "school";
      }
    | {
        "@id": "work3";
      }
    | {
        "@id": "custom2";
      }
    | {
        "@id": "school";
      }
    | {
        "@id": "other3";
      };
  /**
   * The start date when the person joined the organization
   */
  startDate?: string;
  /**
   * The end date when the person left the organization
   */
  endDate?: string;
  /**
   * Whether this is the person's current organization
   */
  current?: boolean;
  /**
   * Source of the organization data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Photo Type
 */
export interface Photo {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The URL of the photo
   */
  value: string;
  /**
   * The binary photo data
   */
  data?: string;
  /**
   * True if the photo is a default photo
   */
  preferred?: boolean;
  /**
   * Source of the photo data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * CoverPhoto Type
 */
export interface CoverPhoto {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The URL of the cover photo
   */
  value: string;
  /**
   * True if the cover photo is the default cover photo
   */
  preferred?: boolean;
  /**
   * Source of the cover photo data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Url Type
 */
export interface Url {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The URL
   */
  value: string;
  /**
   * The type of the URL
   */
  type2?:
    | {
        "@id": "homePage";
      }
    | {
        "@id": "sourceCode";
      }
    | {
        "@id": "blog";
      }
    | {
        "@id": "documentation";
      }
    | {
        "@id": "profile";
      }
    | {
        "@id": "home3";
      }
    | {
        "@id": "work4";
      }
    | {
        "@id": "appInstall";
      }
    | {
        "@id": "linkedIn";
      }
    | {
        "@id": "ftp";
      }
    | {
        "@id": "custom3";
      }
    | {
        "@id": "reservations";
      }
    | {
        "@id": "appInstallPage";
      }
    | {
        "@id": "other4";
      };
  /**
   * Source of the URL data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
  /**
   * Whether this is the preferred URL
   */
  preferred?: boolean;
}

/**
 * Birthday Type
 */
export interface Birthday {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The structured date of the birthday
   */
  valueDate: string;
  /**
   * Source of the birthday data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Biography Type
 */
export interface Biography {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The short biography
   */
  value: string;
  /**
   * The content type of the biography. Available types: TEXT_PLAIN, TEXT_HTML, CONTENT_TYPE_UNSPECIFIED
   */
  contentType?: string;
  /**
   * Source of the biography data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Event Type
 */
export interface Event {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The date of the event
   */
  startDate: string;
  /**
   * The type of the event
   */
  type2?:
    | {
        "@id": "anniversary";
      }
    | {
        "@id": "party";
      }
    | {
        "@id": "birthday2";
      }
    | {
        "@id": "custom4";
      }
    | {
        "@id": "other5";
      };
  /**
   * Source of the event data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Gender Type
 */
export interface Gender {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The gender for the person
   */
  valueIRI:
    | {
        "@id": "male";
      }
    | {
        "@id": "female";
      }
    | {
        "@id": "other6";
      }
    | {
        "@id": "unknown";
      }
    | {
        "@id": "none";
      };
  /**
   * Free form text field for pronouns that should be used to address the person
   */
  addressMeAs?: string;
  /**
   * Source of the gender data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Nickname Type
 */
export interface Nickname {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The nickname
   */
  value: string;
  /**
   * The type of the nickname
   */
  type2?:
    | {
        "@id": "default";
      }
    | {
        "@id": "initials";
      }
    | {
        "@id": "otherName";
      }
    | {
        "@id": "shortName";
      }
    | {
        "@id": "maidenName2";
      }
    | {
        "@id": "alternateName";
      };
  /**
   * Source of the nickname data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Occupation Type
 */
export interface Occupation {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The occupation; for example, carpenter
   */
  value: string;
  /**
   * Source of the occupation data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Relation Type
 */
export interface Relation {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The name of the other person this relation refers to
   */
  value: string;
  /**
   * The person's relation to the other person
   */
  type2?:
    | {
        "@id": "spouse";
      }
    | {
        "@id": "child";
      }
    | {
        "@id": "parent";
      }
    | {
        "@id": "sibling";
      }
    | {
        "@id": "friend";
      }
    | {
        "@id": "colleague";
      }
    | {
        "@id": "manager";
      }
    | {
        "@id": "assistant2";
      }
    | {
        "@id": "brother";
      }
    | {
        "@id": "sister";
      }
    | {
        "@id": "father";
      }
    | {
        "@id": "mother";
      }
    | {
        "@id": "domesticPartner";
      }
    | {
        "@id": "partner";
      }
    | {
        "@id": "referredBy";
      }
    | {
        "@id": "relative";
      }
    | {
        "@id": "other7";
      };
  /**
   * Source of the relation data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Interest Type
 */
export interface Interest {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The interest; for example, stargazing
   */
  value: string;
  /**
   * Source of the interest data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Skill Type
 */
export interface Skill {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The skill; for example, underwater basket weaving
   */
  value: string;
  /**
   * Source of the skill data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * LocationDescriptor Type
 */
export interface LocationDescriptor {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The free-form value of the location
   */
  value: string;
  /**
   * The type of the location. Available types: desk, grewUp
   */
  type2?: string;
  /**
   * Whether the location is the current location
   */
  current?: boolean;
  /**
   * The building identifier
   */
  buildingId?: string;
  /**
   * The floor name or number
   */
  floor?: string;
  /**
   * The floor section in floor_name
   */
  floorSection?: string;
  /**
   * The individual desk location
   */
  deskCode?: string;
  /**
   * Source of the location data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Locale Type
 */
export interface Locale {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The well-formed IETF BCP 47 language tag representing the locale
   */
  value: string;
  /**
   * Source of the locale data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Account Type
 */
export interface Account {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The user name used in the IM client
   */
  value: string;
  /**
   * The type of the IM client
   */
  type2?:
    | {
        "@id": "home2";
      }
    | {
        "@id": "work2";
      }
    | {
        "@id": "other2";
      };
  /**
   * The protocol of the IM client. Available protocols: aim, msn, yahoo, skype, qq, googleTalk, icq, jabber, netMeeting
   */
  protocol?: string;
  /**
   * The server for the IM client
   */
  server?: string;
  /**
   * Source of the chat client data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
  /**
   * Whether this is the preferred email address
   */
  preferred?: boolean;
}

/**
 * SipAddress Type
 */
export interface SipAddress {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The SIP address in the RFC 3261 19.1 SIP URI format
   */
  value: string;
  /**
   * The type of the SIP address
   */
  type2?:
    | {
        "@id": "home4";
      }
    | {
        "@id": "work5";
      }
    | {
        "@id": "mobile3";
      }
    | {
        "@id": "other8";
      };
  /**
   * Source of the SIP address data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * ExternalId Type
 */
export interface ExternalId {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The value of the external ID
   */
  value: string;
  /**
   * The type of the external ID. Available types: account, customer, network, organization
   */
  type2?: string;
  /**
   * Source of the external ID data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * FileAs Type
 */
export interface FileAs {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The file-as value
   */
  value: string;
  /**
   * Source of the file-as data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * CalendarUrl Type
 */
export interface CalendarUrl {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The calendar URL
   */
  value: string;
  /**
   * The type of the calendar URL
   */
  type2?:
    | {
        "@id": "home5";
      }
    | {
        "@id": "availability";
      }
    | {
        "@id": "work6";
      };
  /**
   * Source of the calendar URL data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * ClientData Type
 */
export interface ClientData {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The client specified key of the client data
   */
  key: string;
  /**
   * The client specified value of the client data
   */
  value: string;
  /**
   * Source of the client data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * UserDefined Type
 */
export interface UserDefined {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The end user specified key of the user defined data
   */
  key: string;
  /**
   * The end user specified value of the user defined data
   */
  value: string;
  /**
   * Source of the user defined data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Membership Type
 */
export interface Membership {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Contact group resource name membership
   */
  contactGroupResourceNameMembership?: string;
  /**
   * Whether in viewer domain membership
   */
  inViewerDomainMembership?: boolean;
  /**
   * Source of the membership data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Tag Type
 */
export interface Tag {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * The value of the miscellaneous keyword/tag
   */
  valueIRI:
    | {
        "@id": "ai";
      }
    | {
        "@id": "technology";
      }
    | {
        "@id": "leadership";
      }
    | {
        "@id": "design";
      }
    | {
        "@id": "creative";
      }
    | {
        "@id": "branding";
      }
    | {
        "@id": "humaneTech";
      }
    | {
        "@id": "ethics";
      }
    | {
        "@id": "networking";
      }
    | {
        "@id": "golang";
      }
    | {
        "@id": "infrastructure";
      }
    | {
        "@id": "blockchain";
      }
    | {
        "@id": "protocols";
      }
    | {
        "@id": "p2p";
      }
    | {
        "@id": "entrepreneur";
      }
    | {
        "@id": "climate";
      }
    | {
        "@id": "agriculture";
      }
    | {
        "@id": "socialImpact";
      }
    | {
        "@id": "investing";
      }
    | {
        "@id": "ventures";
      }
    | {
        "@id": "identity";
      }
    | {
        "@id": "trust";
      }
    | {
        "@id": "digitalCredentials";
      }
    | {
        "@id": "crypto";
      }
    | {
        "@id": "organizations";
      }
    | {
        "@id": "transformation";
      }
    | {
        "@id": "author";
      }
    | {
        "@id": "cognition";
      }
    | {
        "@id": "research";
      }
    | {
        "@id": "futurism";
      }
    | {
        "@id": "writing";
      }
    | {
        "@id": "ventureCapital";
      }
    | {
        "@id": "deepTech";
      }
    | {
        "@id": "startups";
      }
    | {
        "@id": "sustainability";
      }
    | {
        "@id": "environment";
      }
    | {
        "@id": "healthcare";
      }
    | {
        "@id": "policy";
      }
    | {
        "@id": "medicare";
      }
    | {
        "@id": "education";
      }
    | {
        "@id": "careerDevelopment";
      }
    | {
        "@id": "openai";
      }
    | {
        "@id": "decentralized";
      }
    | {
        "@id": "database";
      }
    | {
        "@id": "forestry";
      }
    | {
        "@id": "biotech";
      }
    | {
        "@id": "mrna";
      }
    | {
        "@id": "vaccines";
      }
    | {
        "@id": "fintech";
      }
    | {
        "@id": "product";
      }
    | {
        "@id": "ux";
      };
  /**
   * The miscellaneous keyword type. Available types: OUTLOOK_BILLING_INFORMATION, OUTLOOK_DIRECTORY_SERVER, OUTLOOK_KEYWORD, OUTLOOK_MILEAGE, OUTLOOK_PRIORITY, OUTLOOK_SENSITIVITY, OUTLOOK_SUBJECT, OUTLOOK_USER, HOME, WORK, OTHER
   */
  type2?: string;
  /**
   * Source of the tag data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * ContactImportGroup Type
 */
export interface ContactImportGroup {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * ID of the import group
   */
  value: string;
  /**
   * Name of the import group
   */
  name?: string;
  /**
   * Source of the group data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * InternalGroup Type
 */
export interface InternalGroup {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Mostly to preserve current mock UI group id
   */
  value: string;
  /**
   * Source of the internal group data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * NaoStatus Type
 */
export interface NaoStatus {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * NAO status value
   */
  value: string;
  /**
   * Source of the status data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * InvitedAt Type
 */
export interface InvitedAt {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * When the contact was invited
   */
  valueDateTime: string;
  /**
   * Source of the invited date
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * CreatedAt Type
 */
export interface CreatedAt {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * When the contact was created
   */
  valueDateTime: string;
  /**
   * Source of the creation date
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * UpdatedAt Type
 */
export interface UpdatedAt {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * When the contact was last updated
   */
  valueDateTime: string;
  /**
   * Source of the update date
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * JoinedAt Type
 */
export interface JoinedAt {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * When the contact joined
   */
  valueDateTime: string;
  /**
   * Source of the join date
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Headline Type
 */
export interface Headline {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Headline(position at orgName) in Profile
   */
  value: string;
  /**
   * Source of the headline data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Industry Type
 */
export interface Industry {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Industry in which contact works
   */
  value: string;
  /**
   * Source of the industry data
   */
  source?: string;
  /**
   * Whether this is main
   */
  selected?: boolean;
}

/**
 * Education Type
 */
export interface Education {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * School name
   */
  value: string;
  /**
   * Start date of education
   */
  startDate?: string;
  /**
   * End date of education
   */
  endDate?: string;
  /**
   * Education notes
   */
  notes?: string;
  /**
   * Degree name
   */
  degreeName?: string;
  /**
   * Education activities
   */
  activities?: string;
  /**
   * Source of the education data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Language Type
 */
export interface Language {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Language name as IRI
   */
  valueIRI: string;
  /**
   * Language proficiency
   */
  proficiency?:
    | {
        "@id": "elementary";
      }
    | {
        "@id": "limitedWork";
      }
    | {
        "@id": "professionalWork";
      }
    | {
        "@id": "fullWork";
      }
    | {
        "@id": "bilingual";
      };
  /**
   * Source of the language data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Project Type
 */
export interface Project {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Title of project
   */
  value: string;
  /**
   * Project description
   */
  description?: string;
  /**
   * Project URL
   */
  url2?: string;
  /**
   * Project start date
   */
  startDate?: string;
  /**
   * Project end date
   */
  endDate?: string;
  /**
   * Source of the project data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}

/**
 * Publication Type
 */
export interface Publication {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Title of publication
   */
  value: string;
  /**
   * Publication date
   */
  publishDate?: string;
  /**
   * Publication description
   */
  description?: string;
  /**
   * Publisher name
   */
  publisher?: string;
  /**
   * Publication URL
   */
  url2?: string;
  /**
   * Source of the publication data
   */
  source?: string;
  /**
   * Whether this is hidden from list
   */
  hidden?: boolean;
}
