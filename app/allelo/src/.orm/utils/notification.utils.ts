/**
 * Auto-generated file - DO NOT EDIT
 * Generated from notification.shex
 * Run: node scripts/generateContactUtils.js
 */

/**
 * All UserNotification properties that are Set<T> types (cardinality * or +)
 */
export const userNotificationSetProperties = [

] as const;

/**
 * All UserNotification properties that are NOT Set<T> types
 * (cardinality ? or required single values)
 */
export const userNotificationNonSetProperties = [
  "date",
  "body",
  "type",
  "status",
  "seen",
  "hidden",
  "subject",
] as const;

export type UserNotificationSetPropertyName = (typeof userNotificationSetProperties)[number];
export type UserNotificationNonSetPropertyName = (typeof userNotificationNonSetProperties)[number];

/**
 * Dictionary prefixes for UserNotification enumerated properties
 */
export const userNotificationDictPrefixes = {
  "UserNotification.type": "did:ng:x:social:notification:type#",
  "UserNotification.status": "did:ng:x:social:notification:status#",
} as const;

/**
 * Dictionary values for UserNotification enumerated properties
 */
export const userNotificationDictValues = {
  "UserNotification.type": [
    "Connection",
    "System",
    "Vouch",
    "Praise",
  ] as const,
  "UserNotification.status": [
    "Accepted",
    "Rejected",
    "Pending",
  ] as const,
} as const;

/**
 * Union type of all dictionary keys (dotted notation like "phoneNumber.type")
 */
export type UserNotificationDictType = keyof typeof userNotificationDictPrefixes;

/**
 * Mapping of UserNotification properties to their enumerated subproperties
 * Based on the ORM shape definition
 */
export type UserNotificationDictMap = {
  UserNotification: "type" | "status";
};

/**
 * Properties from UserNotification that have dictionary enumerations
 */
export type UserNotificationDictProperty = keyof UserNotificationDictMap;

/**
 * Get the valid subproperty for a specific UserNotification property
 * @example UserNotificationSubPropertyFor<"phoneNumber"> = "type"
 * @example UserNotificationSubPropertyFor<"tag"> = "valueIRI"
 */
export type UserNotificationSubPropertyFor<P extends UserNotificationDictProperty> = UserNotificationDictMap[P];
