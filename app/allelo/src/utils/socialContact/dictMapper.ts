import {
  socialContactDictPrefixes,
  socialContactDictValues,
  SocialContactDictType,
  SocialContactDictProperty, SocialContactSubPropertyFor
} from "@/.orm/utils/contact.utils";

export const dictPrefixes = socialContactDictPrefixes;
export const dictValues = socialContactDictValues;

type DictKey = SocialContactDictType;

/**
 * Get dictionary values for a specific property
 * @param property - The parent property name (e.g., "phoneNumber", "email")
 * @param subProperty - The nested property name (e.g., "type", "valueIRI")
 */
export function getContactDictValues<P extends SocialContactDictProperty>(
  property: P,
  subProperty: SocialContactSubPropertyFor<P>
): readonly string[] {
  const dictKey = `${property}.${subProperty}` as DictKey;
  return dictValues[dictKey] || [];
}

/**
 * Get IRI value for a dictionary property
 * @param property - The parent property name (e.g., "phoneNumber", "email")
 * @param subProperty - The nested property name (e.g., "type", "valueIRI")
 * @param value - The value to validate and return
 */
export function getContactIriValue<P extends SocialContactDictProperty>(
  property: P,
  subProperty: SocialContactSubPropertyFor<P>,
  value?: string
) {
  if (!value) {
    return;
  }
  const dictionary = getContactDictValues(property, subProperty);
  const dictKey = `${property}.${subProperty}`;

  if (!dictionary || !dictionary.includes(value)) {
    console.log("Unknown value: " + value, " dictionary: " + dictKey);
    value = "other";
  }
  return [{"@id": value}];
}

/**
 * Append prefix to dictionary value
 * @param property - The parent property name (e.g., "phoneNumber", "email")
 * @param subProperty - The nested property name (e.g., "type", "valueIRI")
 * @param value - The value to append the prefix to
 */
export function appendPrefixToDictValue<P extends SocialContactDictProperty>(
  property: P,
  subProperty: SocialContactSubPropertyFor<P>,
  value?: string
) {
  if (!value) {
    return "";
  }

  const dictKey = `${property}.${subProperty}` as DictKey;
  const prefix = dictPrefixes[dictKey];

  if (!prefix) {
    return value;
  }

  const dictionary = getContactDictValues(property, subProperty);
  if (!dictionary || !dictionary.includes(value)) {
    console.log("Unknown value: " + value, " dictionary: " + dictKey);
    value = "other";
  }

  return prefix + value;
}