/**
 * Auto-generated file - DO NOT EDIT
 * Generated from contact.typings.ts
 * Run: node scripts/generateContactUtils.js
 */

/**
 * All SocialContact properties that are Set<T> types
 */
export const contactSetProperties = [
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
  "internalGroup",
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
 * (excluding readonly @graph and @id)
 */
export const contactNonSetProperties = [
  "rcard",
  "naoStatus",
  "invitedAt",
  "createdAt",
  "updatedAt",
  "joinedAt",
  "centralityScore",
  "mostRecentInteraction",
] as const;

export type ContactSetPropertyName = (typeof contactSetProperties)[number];
export type ContactNonSetPropertyName = (typeof contactNonSetProperties)[number];
