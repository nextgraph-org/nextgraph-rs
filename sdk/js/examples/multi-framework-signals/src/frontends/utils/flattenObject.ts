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

        // Handle Sets containing objects with @id
        if (value instanceof Set) {
            const setItems = Array.from(value);
            // Check if Set contains objects with @id
            if (
                setItems.length > 0 &&
                setItems.some(
                    (item) => item && typeof item === "object" && "@id" in item
                )
            ) {
                // Flatten each object in the Set
                setItems.forEach((item) => {
                    if (item && typeof item === "object" && "@id" in item) {
                        const itemId = item["@id"];
                        const itemPrefix = `${fullKey}[@id=${itemId}]`;
                        result.push(
                            ...flattenObject(
                                item,
                                itemPrefix,
                                options,
                                seen,
                                depth + 1
                            )
                        );
                    }
                });
            } else {
                // Set doesn't contain objects with @id, treat as leaf
                result.push([fullKey, value, key, obj]);
            }
        } else if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            isPlainObject(value)
        ) {
            result.push(
                ...flattenObject(value, fullKey, options, seen, depth + 1)
            );
        } else {
            result.push([fullKey, value, key, obj]);
        }
    }
    return result;
};

export default flattenObject;
