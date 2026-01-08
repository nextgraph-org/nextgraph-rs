/**
 * Auto-generated file - DO NOT EDIT
 * Generated from shortcontact.shex
 * Run: node scripts/generateContactUtils.js
 */

/**
 * All ShortSocialContact properties that are Set<T> types (cardinality * or +)
 */
export const shortSocialContactSetProperties = [
  "name",
  "address",
  "photo",
] as const;

/**
 * All ShortSocialContact properties that are NOT Set<T> types
 * (cardinality ? or required single values)
 */
export const shortSocialContactNonSetProperties = [
  "naoStatus",
  "centralityScore",
  "mostRecentInteraction",
] as const;

export type ShortSocialContactSetPropertyName = (typeof shortSocialContactSetProperties)[number];
export type ShortSocialContactNonSetPropertyName = (typeof shortSocialContactNonSetProperties)[number];

/**
 * Dictionary prefixes for ShortSocialContact enumerated properties
 */
export const shortSocialContactDictPrefixes = {
  "address.type": "did:ng:k:contact:type#",
} as const;

/**
 * Dictionary values for ShortSocialContact enumerated properties
 */
export const shortSocialContactDictValues = {
  "address.type": [
    "home",
    "work",
    "custom",
    "other",
  ] as const,
} as const;

/**
 * Union type of all dictionary keys (dotted notation like "phoneNumber.type")
 */
export type ShortSocialContactDictType = keyof typeof shortSocialContactDictPrefixes;

/**
 * Mapping of ShortSocialContact properties to their enumerated subproperties
 * Based on the ORM shape definition
 */
export type ShortSocialContactDictMap = {
  address: "type";
};

/**
 * Properties from ShortSocialContact that have dictionary enumerations
 */
export type ShortSocialContactDictProperty = keyof ShortSocialContactDictMap;

/**
 * Get the valid subproperty for a specific ShortSocialContact property
 * @example ShortSocialContactSubPropertyFor<"phoneNumber"> = "type"
 * @example ShortSocialContactSubPropertyFor<"tag"> = "valueIRI"
 */
export type ShortSocialContactSubPropertyFor<P extends ShortSocialContactDictProperty> = ShortSocialContactDictMap[P];
