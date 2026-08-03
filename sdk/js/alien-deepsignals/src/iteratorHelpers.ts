function hasNativeIteratorHelpers() {
    return (
        typeof Iterator !== "undefined" && typeof Iterator.from === "function"
    );
}

export const iteratorFnKeys = new Set([
    "drop",
    "every",
    "filter",
    "find",
    "flatMap",
    "forEach",
    "includes",
    "map",
    "reduce",
    "some",
    "take",
    "toArray",
    Symbol.iterator,
    Symbol.asyncIterator,
]);

export const nonMutatingArrayFnKeys = new Set([
    "at",
    "concat",
    "entries",
    "findIndex",
    "findLast",
    "findLastIndex",
    "flat",
    "indexOf",
    "join",
    "keys",
    "lastIndexOf",
    "reduceRight",
    "toLocaleString",
    "toReversed",
    "toSorted",
    "toLocaleString",
    "toSpliced",
    "slice",
    "values",
    "with",
    "filter",
    "map",
    "flatMap",
    "every",
    "forEach",
    "find",
    "some",
    "reduce",
    "includes",
    "copyWithin",
    Symbol.toString,
    Symbol.toStringTag,
]).union(iteratorFnKeys);

export const nonMutatingSetFnKeys = new Set([
    "difference",
    "entries",
    "forEach",
    "has",
    "intersection",
    "isDisjointFrom",
    "isSubsetOf",
    "isSupersetOf",
    "keys",
    "symmetricDifference",
    "union",
    "values",
    Symbol.toString,
    Symbol.toStringTag,
]).union(iteratorFnKeys);

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
