/**
 * Auto-generated file - DO NOT EDIT
 * Generated from group.shex
 * Run: node scripts/generateContactUtils.js
 */

/**
 * All SocialGroup properties that are Set<T> types (cardinality * or +)
 */
export const socialGroupSetProperties = [
  "tag",
  "hasMember",
  "post",
] as const;

/**
 * All SocialGroup properties that are NOT Set<T> types
 * (cardinality ? or required single values)
 */
export const socialGroupNonSetProperties = [
  "title",
  "description",
  "logoIRI",
  "createdAt",
] as const;

export type SocialGroupSetPropertyName = (typeof socialGroupSetProperties)[number];
export type SocialGroupNonSetPropertyName = (typeof socialGroupNonSetProperties)[number];

/**
 * Dictionary prefixes for SocialGroup enumerated properties
 */
export const socialGroupDictPrefixes = {
  "hasMember.memberStatus": "did:ng:k:contact:memberStatus#",
} as const;

/**
 * Dictionary values for SocialGroup enumerated properties
 */
export const socialGroupDictValues = {
  "hasMember.memberStatus": [
    "invited",
    "joined",
    "declined",
  ] as const,
} as const;

/**
 * Union type of all dictionary keys (dotted notation like "phoneNumber.type")
 */
export type SocialGroupDictType = keyof typeof socialGroupDictPrefixes;

/**
 * Mapping of SocialGroup properties to their enumerated subproperties
 * Based on the ORM shape definition
 */
export type SocialGroupDictMap = {
  hasMember: "memberStatus";
};

/**
 * Properties from SocialGroup that have dictionary enumerations
 */
export type SocialGroupDictProperty = keyof SocialGroupDictMap;

/**
 * Get the valid subproperty for a specific SocialGroup property
 * @example SocialGroupSubPropertyFor<"phoneNumber"> = "type"
 * @example SocialGroupSubPropertyFor<"tag"> = "valueIRI"
 */
export type SocialGroupSubPropertyFor<P extends SocialGroupDictProperty> = SocialGroupDictMap[P];

/**
 * All SocialPost properties that are Set<T> types (cardinality * or +)
 */
export const socialPostSetProperties = [
  "tag",
] as const;

/**
 * All SocialPost properties that are NOT Set<T> types
 * (cardinality ? or required single values)
 */
export const socialPostNonSetProperties = [
  "author",
  "createdAt",
  "description",
] as const;

export type SocialPostSetPropertyName = (typeof socialPostSetProperties)[number];
export type SocialPostNonSetPropertyName = (typeof socialPostNonSetProperties)[number];
