/**
 * Central registry of all DictMapper singletons
 * Import mappers from here for any entity type
 */

import { DictMapper } from "./DictMapper";

// Import all entity dict configs
import {
  socialContactDictPrefixes,
  socialContactDictValues,
  type SocialContactDictMap,
} from "@/.orm/utils/contact.utils";

import {
  rCardDictPrefixes,
  rCardDictValues,
  type RCardDictMap,
} from "@/.orm/utils/rcard.utils";

import {
  socialGroupDictPrefixes,
  socialGroupDictValues,
  type SocialGroupDictMap,
} from "@/.orm/utils/group.utils";
import {
  UserNotificationDictMap,
  userNotificationDictPrefixes,
  userNotificationDictValues
} from "@/.orm/utils/notification.utils.ts";

/**
 * Singleton DictMapper for SocialContact entities
 */
export const contactDictMapper = new DictMapper<
  typeof socialContactDictPrefixes,
  typeof socialContactDictValues,
  SocialContactDictMap
>(
  socialContactDictPrefixes,
  socialContactDictValues
);

/**
 * Singleton DictMapper for RCard entities
 */
export const rCardDictMapper = new DictMapper<
  typeof rCardDictPrefixes,
  typeof rCardDictValues,
  RCardDictMap
>(
  rCardDictPrefixes,
  rCardDictValues
);

/**
 * Singleton DictMapper for SocialGroup entities
 */
export const groupDictMapper = new DictMapper<
  typeof socialGroupDictPrefixes,
  typeof socialGroupDictValues,
  SocialGroupDictMap
>(
  socialGroupDictPrefixes,
  socialGroupDictValues
);

/**
 * Singleton DictMapper for UserNotification entities
 */
export const userNotificationDictMapper = new DictMapper<
  typeof userNotificationDictPrefixes,
  typeof userNotificationDictValues,
  UserNotificationDictMap
>(
  userNotificationDictPrefixes,
  userNotificationDictValues
);

/**
 * Registry object for dynamic access by entity type
 */
export const dictMappers = {
  contact: contactDictMapper,
  socialContact: contactDictMapper, // alias
  rCard: rCardDictMapper,
  group: groupDictMapper,
  socialGroup: groupDictMapper, // alias
  userNotification: userNotificationDictMapper,
} as const;

/**
 * Type-safe getter for mappers by entity type
 */
export type EntityType = keyof typeof dictMappers;

export function getDictMapper(entityType: EntityType) {
  return dictMappers[entityType];
}