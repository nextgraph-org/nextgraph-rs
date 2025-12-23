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

/**
 * Union type of all dictionary keys (dotted notation like "phoneNumber.type")
 */
export type RCardDictType = keyof typeof rCardDictPrefixes;

/**
 * Mapping of RCard properties to their enumerated subproperties
 * Based on the ORM shape definition
 */
export type RCardDictMap = {
  permission: "zone";
};

/**
 * Properties from RCard that have dictionary enumerations
 */
export type RCardDictProperty = keyof RCardDictMap;

/**
 * Get the valid subproperty for a specific RCard property
 * @example RCardSubPropertyFor<"phoneNumber"> = "type"
 * @example RCardSubPropertyFor<"tag"> = "valueIRI"
 */
export type RCardSubPropertyFor<P extends RCardDictProperty> = RCardDictMap[P];
