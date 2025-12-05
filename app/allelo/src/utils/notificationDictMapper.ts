import { notificationContext } from "@/.ldo/notification.context.ts";

const notificationDictPrefixes = {
  notificationType: "did:ng:x:social:notification:type#",
  notificationStatus: "did:ng:x:social:notification:status#",
};

type NotificationDictType = keyof typeof notificationDictPrefixes;
type NotificationPrefix = (typeof notificationDictPrefixes)[NotificationDictType];

const loadedNotificationDictionaries: Record<NotificationPrefix, string[]> = {};

function loadNotificationDictionary(prefix: NotificationPrefix) {
  const values: string[] = [];

  for (const value of Object.values(notificationContext)) {
    if (typeof value === "string" && value.startsWith(prefix)) {
      values.push(value.substring(prefix.length));
    }
  }

  return values;
}

export function getNotificationDictValues(dictType: NotificationDictType) {
  const prefix = notificationDictPrefixes[dictType];
  loadedNotificationDictionaries[prefix] = loadNotificationDictionary(prefix);
  return loadedNotificationDictionaries[prefix];
}

export function getNotificationIriValue(
  dictType: NotificationDictType,
  value?: string,
) {
  if (!value) {
    return;
  }

  const dictionary = getNotificationDictValues(dictType);
  if (!dictionary || !dictionary.includes(value)) {
    console.log("Unknown value: " + value, " dictionary: " + dictType);
    value = "other";
  }

  return [{ "@id": value }];
}
