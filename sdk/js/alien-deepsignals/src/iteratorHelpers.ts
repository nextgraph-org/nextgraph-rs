function hasNativeIteratorHelpers() {
    return (
        typeof Iterator !== "undefined" && typeof Iterator.from === "function"
    );
}

export const iteratorHelperKeys = new Set([
    "map",
    "filter",
    "take",
    "drop",
    "flatMap",
    "reduce",
    "toArray",
    "forEach",
    "some",
    "every",
    "find",
]);

export function createIteratorWithHelpers<T>(
    nextImpl: () => IteratorResult<T, undefined>,
    sourceIterator?: Iterator<unknown, unknown, undefined>
): IteratorObject<T, undefined, unknown> {
    const base = {
        next: nextImpl,
        [Symbol.iterator]() {
            return this;
        },
        return() {
            if (sourceIterator && typeof sourceIterator.return === "function") {
                sourceIterator.return();
            }
            return { value: undefined, done: true as const };
        },
    } as IteratorObject<T, undefined, unknown>;

    if (hasNativeIteratorHelpers()) {
        return Iterator.from(base);
    }

    return base;
}
