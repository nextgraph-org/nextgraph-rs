interface FlattenOptions {
  /** Maximum depth to traverse (default: 8). */
  maxDepth?: number;
  /** Skip keys that start with a dollar sign (deepSignal meta). Default: true */
  skipDollarKeys?: boolean;
}

const isPlainObject = (v: any) =>
  Object.prototype.toString.call(v) === "[object Object]";

const flattenObject = (
  obj: any,
  prefix = "",
  options: FlattenOptions = {},
  seen = new Set<any>(),
  depth = 0
): Array<[string, any, string, any]> => {
  const { maxDepth = 8, skipDollarKeys = true } = options;
  const result: Array<[string, any, string, any]> = [];
  if (!obj || typeof obj !== "object") return result;
  if (seen.has(obj)) return result; // cycle detected
  seen.add(obj);
  if (depth > maxDepth) return result;

  for (const [key, value] of Object.entries(obj)) {
    if (skipDollarKeys && key.startsWith("$")) continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Set) &&
      isPlainObject(value)
    ) {
      result.push(...flattenObject(value, fullKey, options, seen, depth + 1));
    } else {
      result.push([fullKey, value, key, obj]);
    }
  }
  return result;
};

export default flattenObject;
