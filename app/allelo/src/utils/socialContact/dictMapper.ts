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

type DictValue<P, SP extends PropertyKey> =
  P extends Record<SP, infer V> ? (V & string) : never;

/**
 * Append prefix to dictionary value
 * @param property - The parent property name (e.g., "phoneNumber", "email")
 * @param subProperty - The nested property name (e.g., "type", "valueIRI")
 * @param value - The value to append the prefix to
 */
export function appendPrefixToDictValue<
  P extends SocialContactDictProperty,
  SP extends SocialContactSubPropertyFor<P>
>(
  property: P,
  subProperty: SP,
  value?: string
): DictValue<P, SP> {
  if (!value) {
    return "" as DictValue<P, SP>;
  }

  const dictKey = `${property}.${subProperty}` as DictKey;
  const prefix = dictPrefixes[dictKey];

  if (!prefix) {
    return value as DictValue<P, SP>;
  }

  const dictionary = getContactDictValues(property, subProperty);
  if (!dictionary || !dictionary.includes(value)) {
    console.log("Unknown value: " + value, " dictionary: " + dictKey);
    value = "other";
  }

  return prefix + value as DictValue<P, SP>;
}

export function removePrefix(value?: string): string {
  if (!value) {
    return "";
  }
  return value.split("#")[1] ?? "";
}