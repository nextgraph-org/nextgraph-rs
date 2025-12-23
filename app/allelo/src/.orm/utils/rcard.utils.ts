/**
 * Auto-generated file - DO NOT EDIT
 * Generated from rcard.shex
 * Run: node scripts/generateContactUtils.js
 */

/**
 * All RCard properties that are Set<T> types (cardinality * or +)
 */
export const rCardSetProperties = [
  "permission",
] as const;

/**
 * All RCard properties that are NOT Set<T> types
 * (cardinality ? or required single values)
 */
export const rCardNonSetProperties = [
  "cardId",
  "order",
] as const;

export type RCardSetPropertyName = (typeof rCardSetProperties)[number];
export type RCardNonSetPropertyName = (typeof rCardNonSetProperties)[number];

/**
 * Dictionary prefixes for RCard enumerated properties
 */
export const rCardDictPrefixes = {
  "permission.zone": "did:ng:k:social:rcard:permission:zone#",
} as const;

/**
 * Dictionary values for RCard enumerated properties
 */
export const rCardDictValues = {
  "permission.zone": [
    "top",
    "bottom",
    "middle",
  ] as const,
} as const;

export type RCardDictType = keyof typeof rCardDictPrefixes;
