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

  isDictProperty(property: string, subProperty: string): boolean {
    const dictKey = `${String(property)}.${String(subProperty)}`;
    return dictKey in this.values;
  }

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
  ): DictValue<P, SP> | undefined {
    if (!value) {
      return;
    }

    const prefix = this.getPrefix(property, subProperty);
    if (!prefix) {
      return;
    }

    if (!this.isValidValue(property, subProperty, value)) {
      console.log("Unknown value: " + value, " property: " + `${String(property)}.${String(subProperty)}`);
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
}
