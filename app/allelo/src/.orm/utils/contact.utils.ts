/**
 * Auto-generated file - DO NOT EDIT
 * Generated from contact.shex
 * Run: node scripts/generateContactUtils.js
 */

/**
 * All SocialContact properties that are Set<T> types (cardinality * or +)
 */
export const socialContactSetProperties = [
  "phoneNumber",
  "name",
  "email",
  "address",
  "organization",
  "photo",
  "coverPhoto",
  "url",
  "birthday",
  "biography",
  "event",
  "gender",
  "nickname",
  "occupation",
  "relation",
  "interest",
  "skill",
  "locationDescriptor",
  "locale",
  "account",
  "sipAddress",
  "extId",
  "fileAs",
  "calendarUrl",
  "clientData",
  "userDefined",
  "membership",
  "tag",
  "contactImportGroup",
  "headline",
  "industry",
  "education",
  "language",
  "project",
  "publication",
  "mergedInto",
  "mergedFrom",
] as const;

/**
 * All SocialContact properties that are NOT Set<T> types
 * (cardinality ? or required single values)
 */
export const socialContactNonSetProperties = [
  "rcard",
  "naoStatus",
  "invitedAt",
  "createdAt",
  "updatedAt",
  "joinedAt",
  "centralityScore",
  "mostRecentInteraction",
  "isDraft",
] as const;

export type SocialContactSetPropertyName = (typeof socialContactSetProperties)[number];
export type SocialContactNonSetPropertyName = (typeof socialContactNonSetProperties)[number];

/**
 * Dictionary prefixes for SocialContact enumerated properties
 */
export const socialContactDictPrefixes = {
  "phoneNumber.type": "did:ng:k:contact:phoneNumber#",
  "email.type": "did:ng:k:contact:type#",
  "address.type": "did:ng:k:contact:type#",
  "organization.type": "did:ng:k:org:type#",
  "url.type": "did:ng:k:link:type#",
  "event.type": "did:ng:k:event#",
  "gender.valueIRI": "did:ng:k:gender#",
  "nickname.type": "did:ng:k:contact:nickname#",
  "relation.type": "did:ng:k:humanRelationship#",
  "account.type": "did:ng:k:contact:type#",
  "sipAddress.type": "did:ng:k:contact:sip#",
  "calendarUrl.type": "did:ng:k:calendar:type#",
  "tag.valueIRI": "did:ng:k:contact:tag#",
  "language.proficiency": "did:ng:k:skills:language:proficiency#",
} as const;

/**
 * Dictionary values for SocialContact enumerated properties
 */
export const socialContactDictValues = {
  "phoneNumber.type": [
    "home",
    "work",
    "mobile",
    "homeFax",
    "workFax",
    "otherFax",
    "pager",
    "workMobile",
    "workPager",
    "main",
    "googleVoice",
    "callback",
    "car",
    "companyMain",
    "isdn",
    "radio",
    "telex",
    "ttyTdd",
    "assistant",
    "mms",
    "other",
  ] as const,
  "email.type": [
    "home",
    "work",
    "mobile",
    "custom",
    "other",
  ] as const,
  "address.type": [
    "home",
    "work",
    "custom",
    "other",
  ] as const,
  "organization.type": [
    "business",
    "school",
    "work",
    "custom",
    "school",
    "other",
  ] as const,
  "url.type": [
    "homepage",
    "sourceCode",
    "blog",
    "documentation",
    "profile",
    "home",
    "work",
    "appInstall",
    "linkedin",
    "ftp",
    "custom",
    "reservations",
    "appInstallPage",
    "other",
  ] as const,
  "event.type": [
    "anniversary",
    "party",
    "birthday",
    "custom",
    "other",
  ] as const,
  "gender.valueIRI": [
    "male",
    "female",
    "other",
    "unknown",
    "none",
  ] as const,
  "nickname.type": [
    "default",
    "initials",
    "otherName",
    "shortName",
    "maidenName",
    "alternateName",
  ] as const,
  "relation.type": [
    "spouse",
    "child",
    "parent",
    "sibling",
    "friend",
    "colleague",
    "manager",
    "assistant",
    "brother",
    "sister",
    "father",
    "mother",
    "domesticPartner",
    "partner",
    "referredBy",
    "relative",
    "other",
  ] as const,
  "account.type": [
    "home",
    "work",
    "other",
  ] as const,
  "sipAddress.type": [
    "home",
    "work",
    "mobile",
    "other",
  ] as const,
  "calendarUrl.type": [
    "home",
    "availability",
    "work",
  ] as const,
  "tag.valueIRI": [
    "ai",
    "technology",
    "leadership",
    "design",
    "creative",
    "branding",
    "humaneTech",
    "ethics",
    "networking",
    "golang",
    "infrastructure",
    "blockchain",
    "protocols",
    "p2p",
    "entrepreneur",
    "climate",
    "agriculture",
    "socialImpact",
    "investing",
    "ventures",
    "identity",
    "trust",
    "digitalCredentials",
    "crypto",
    "organizations",
    "transformation",
    "author",
    "cognition",
    "research",
    "futurism",
    "writing",
    "ventureCapital",
    "deepTech",
    "startups",
    "sustainability",
    "environment",
    "healthcare",
    "policy",
    "medicare",
    "education",
    "careerDevelopment",
    "openai",
    "decentralized",
    "database",
    "forestry",
    "biotech",
    "mrna",
    "vaccines",
    "fintech",
    "product",
    "ux",
  ] as const,
  "language.proficiency": [
    "elementary",
    "limitedWork",
    "professionalWork",
    "fullWork",
    "bilingual",
  ] as const,
} as const;

/**
 * Union type of all dictionary keys (dotted notation like "phoneNumber.type")
 */
export type SocialContactDictType = keyof typeof socialContactDictPrefixes;

/**
 * Mapping of SocialContact properties to their enumerated subproperties
 * Based on the ORM shape definition
 */
export type SocialContactDictMap = {
  phoneNumber: "type";
  email: "type";
  address: "type";
  organization: "type";
  url: "type";
  event: "type";
  gender: "valueIRI";
  nickname: "type";
  relation: "type";
  account: "type";
  sipAddress: "type";
  calendarUrl: "type";
  tag: "valueIRI";
  language: "proficiency";
};

/**
 * Properties from SocialContact that have dictionary enumerations
 */
export type SocialContactDictProperty = keyof SocialContactDictMap;

/**
 * Get the valid subproperty for a specific SocialContact property
 * @example SocialContactSubPropertyFor<"phoneNumber"> = "type"
 * @example SocialContactSubPropertyFor<"tag"> = "valueIRI"
 */
export type SocialContactSubPropertyFor<P extends SocialContactDictProperty> = SocialContactDictMap[P];
