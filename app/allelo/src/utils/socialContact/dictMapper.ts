import {contactContext} from "@/.ldo/contact.context.ts";

export const dictPrefixes = {
  "tag": "did:ng:k:contact:tag#",
  "organization": "did:ng:k:org:type#",
  "gender": "did:ng:k:gender#",
  "email": "did:ng:k:contact:type#",
  "address": "did:ng:k:contact:type#",
  "phoneNumber": "did:ng:k:contact:phoneNumber#",
  "url": "did:ng:k:link:type#",
  "event": "did:ng:k:event#",
  "relation": "did:ng:k:humanRelationship#",
  "account": "did:ng:k:contact:type#",
  "sipAddress": "did:ng:k:contact:sip#",
  "calendarUrl": "did:ng:k:calendar:type#"
}

type DictType = keyof typeof dictPrefixes;
type PrefixType = (typeof dictPrefixes)[DictType];

const loadedDictionaries: Record<PrefixType, string[]> = {}

function loadDictionary(prefix: PrefixType) {
  const values: string[] = [];

  for (const value of Object.values(contactContext)) {
    if (typeof value === 'string' && value.startsWith(prefix)) {
      values.push(value.substring(prefix.length));
    }
  }

  return values;
}

export function getContactDictValues(dictType: DictType) {
  const prefix = dictPrefixes[dictType];
  loadedDictionaries[prefix] ??= loadDictionary(prefix);
  return loadedDictionaries[prefix];
}

export function getContactIriValue(dictType: DictType, value?: string) {
  if (!value) {
    return;
  }
  const dictionary = getContactDictValues(dictType);
  if (!dictionary || !dictionary.includes(value)) {
    console.log("Unknown value: " + value, " dictionary: " + dictType);
    value = "other";
  }
  return [{"@id": value}];
}

export function appendPrefixToDictValue(dictType: string, value?: string) {
  if (!value) {
    return "";
  }
  if (!dictPrefixes[dictType]) {
    return value;
  }

  const dictionary = getContactDictValues(dictType);
  if (!dictionary || !dictionary.includes(value)) {
    console.log("Unknown value: " + value, " dictionary: " + dictType);
    value = "other";
  }

  return dictPrefixes[dictType] + value;
}