/**
 * Type for dictionary value - represents a string value from a specific dictionary
 */
type DictValue<P, SP extends PropertyKey> =
  P extends Record<SP, infer V> ? (V & string) : never;

/**
 * Generic dictionary mapper class for ORM entities
 * Provides type-safe dictionary operations (prefixing, value validation, etc.)
 */
export class DictMapper<
  DictPrefixes extends Record<string, string>,
  DictValues extends Record<keyof DictPrefixes, readonly string[]>,
  DictMap extends Record<string, string>
> {
  constructor(
    public readonly prefixes: DictPrefixes,
    public readonly values: DictValues
  ) {}

  /**
   * Get all valid values for a specific property
   * @param property - The parent property name (e.g., "phoneNumber", "email")
   * @param subProperty - The nested property name (e.g., "type", "valueIRI")
   */
  getDictValues<
    P extends keyof DictMap,
    SP extends DictMap[P]
  >(
    property: P,
    subProperty: SP
  ): readonly string[] {
    const dictKey = `${String(property)}.${String(subProperty)}`;
    return this.values[dictKey as keyof DictValues] || [];
  }

  /**
   * Append prefix to a dictionary value with validation
   * @param property - The parent property name (e.g., "phoneNumber", "email")
   * @param subProperty - The nested property name (e.g., "type", "valueIRI")
   * @param value - The value to append the prefix to
   */
  appendPrefixToDictValue<
    P extends keyof DictMap,
    SP extends DictMap[P]
  >(
    property: P,
    subProperty: SP,
    value?: string | null
  ): DictValue<P, SP> {
    if (!value) {
      return "" as DictValue<P, SP>;
    }

    const dictKey = `${String(property)}.${String(subProperty)}`;
    const prefix = this.prefixes[dictKey as keyof DictPrefixes];

    if (!prefix) {
      return value as DictValue<P, SP>;
    }

    const dictionary = this.getDictValues(property, subProperty);
    if (!dictionary || !dictionary.includes(value)) {
      console.log("Unknown value: " + value, " dictionary: " + dictKey);
      value = "other";
    }

    return (prefix + value) as DictValue<P, SP>;
  }

  /**
   * Remove prefix from a dictionary value
   */
  removePrefix(value?: string): string {
    if (!value) {
      return "";
    }
    return value.split("#")[1] ?? "";
  }

  /**
   * Check if a value is valid for a dictionary
   * @param property - The parent property name (e.g., "phoneNumber", "email")
   * @param subProperty - The nested property name (e.g., "type", "valueIRI")
   * @param value - The value to check
   */
  isValidValue<
    P extends keyof DictMap,
    SP extends DictMap[P]
  >(
    property: P,
    subProperty: SP,
    value: string
  ): boolean {
    const dictionary = this.getDictValues(property, subProperty);
    return dictionary.includes(value);
  }

  /**
   * Get the prefix for a specific property
   * @param property - The parent property name (e.g., "phoneNumber", "email")
   * @param subProperty - The nested property name (e.g., "type", "valueIRI")
   */
  getPrefix<
    P extends keyof DictMap,
    SP extends DictMap[P]
  >(
    property: P,
    subProperty: SP
  ): string {
    const dictKey = `${String(property)}.${String(subProperty)}`;
    return this.prefixes[dictKey as keyof DictPrefixes] || "";
  }
}
