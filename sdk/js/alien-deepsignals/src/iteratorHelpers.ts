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
    "some",
    "every",
    "find",
]);

export function createIteratorWithHelpers<T>(
    nextImpl: () => IteratorResult<T, undefined>
): IteratorObject<T, undefined, unknown> {
    const base = {
        next: nextImpl,
        [Symbol.iterator]() {
            return this;
        },
    } as IteratorObject<T, undefined, unknown>;

    if (hasNativeIteratorHelpers()) {
        return Iterator.from(base);
    }

    return attachIteratorPolyfill(base);
}

function attachIteratorPolyfill<T>(
    iterator: IteratorObject<T, undefined, unknown>
): IteratorObject<T, undefined, unknown> {
    (iterator as any).map = iteratorMap;
    (iterator as any).filter = iteratorFilter;
    (iterator as any).take = iteratorTake;
    (iterator as any).drop = iteratorDrop;
    (iterator as any).flatMap = iteratorFlatMap;
    (iterator as any).reduce = iteratorReduce;
    (iterator as any).toArray = iteratorToArray;
    (iterator as any).forEach = iteratorForEach;
    (iterator as any).some = iteratorSome;
    (iterator as any).every = iteratorEvery;
    (iterator as any).find = iteratorFind;
    Object.defineProperty(iterator, Symbol.toStringTag, {
        value: "Iterator",
        configurable: true,
    });
    if (typeof Symbol.dispose === "symbol") {
        const disposable = iterator as any;
        if (Symbol.dispose in disposable) return iterator;
        Object.defineProperty(disposable, Symbol.dispose, {
            value() {
                /* no-op polyfill */
            },
            configurable: true,
        });
    }
    return iterator;
}

function iteratorMap<T, U>(
    this: IteratorObject<T, undefined, unknown>,
    callbackfn: (value: T, index: number) => U
): IteratorObject<U, undefined, unknown> {
    const source = this;
    let index = 0;
    return createIteratorWithHelpers(() => {
        const step = source.next();
        if (step.done) return step as IteratorResult<U, undefined>;
        return { value: callbackfn(step.value, index++), done: false };
    });
}

function iteratorFilter<T, S extends T>(
    this: IteratorObject<T, undefined, unknown>,
    predicate: (value: T, index: number) => value is S
): IteratorObject<S, undefined, unknown>;
function iteratorFilter<T>(
    this: IteratorObject<T, undefined, unknown>,
    predicate: (value: T, index: number) => unknown
): IteratorObject<T, undefined, unknown>;
function iteratorFilter<T>(
    this: IteratorObject<T, undefined, unknown>,
    predicate: (value: T, index: number) => unknown
): IteratorObject<T, undefined, unknown> {
    const source = this;
    let index = 0;
    return createIteratorWithHelpers(() => {
        while (true) {
            const step = source.next();
            if (step.done) return step;
            if (predicate(step.value, index++)) {
                return { value: step.value, done: false };
            }
        }
    });
}

function iteratorTake<T>(
    this: IteratorObject<T, undefined, unknown>,
    limit: number
): IteratorObject<T, undefined, unknown> {
    const source = this;
    let remaining = Math.max(0, Math.trunc(limit));
    return createIteratorWithHelpers(() => {
        if (remaining <= 0) return { value: undefined, done: true };
        const step = source.next();
        if (step.done) return step;
        remaining -= 1;
        return step;
    });
}

function iteratorDrop<T>(
    this: IteratorObject<T, undefined, unknown>,
    count: number
): IteratorObject<T, undefined, unknown> {
    const source = this;
    let remaining = Math.max(0, Math.trunc(count));
    return createIteratorWithHelpers(() => {
        while (remaining > 0) {
            const skipped = source.next();
            if (skipped.done) return skipped;
            remaining -= 1;
        }
        return source.next();
    });
}

function iteratorFlatMap<T, U>(
    this: IteratorObject<T, undefined, unknown>,
    callback: (
        value: T,
        index: number
    ) => Iterator<U, unknown, undefined> | Iterable<U, unknown, undefined>
): IteratorObject<U, undefined, unknown> {
    const source = this;
    let index = 0;
    let inner: IteratorObject<U, undefined, unknown> | undefined;

    return createIteratorWithHelpers(() => {
        while (true) {
            if (inner) {
                const innerStep = inner.next();
                if (!innerStep.done) return innerStep;
                inner = undefined;
            }
            const outerStep = source.next();
            if (outerStep.done)
                return outerStep as IteratorResult<U, undefined>;
            const produced = callback(outerStep.value, index++);
            inner = toIteratorObject(produced);
        }
    });
}

function iteratorReduce<T>(
    this: IteratorObject<T, undefined, unknown>,
    callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => T
): T;
function iteratorReduce<T, U>(
    this: IteratorObject<T, undefined, unknown>,
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U,
    initialValue: U
): U;
function iteratorReduce<T, U>(
    this: IteratorObject<T, undefined, unknown>,
    callbackfn: (
        previousValue: U | T,
        currentValue: T,
        currentIndex: number
    ) => U | T,
    initialValue?: U
): U | T {
    let accumulator: U | T | undefined = initialValue;
    let hasAccumulator = arguments.length >= 2;
    let index = 0;
    if (!hasAccumulator) {
        const first = this.next();
        if (first.done) {
            throw new TypeError(
                "reduce() called on an empty iterator without an initial value"
            );
        }
        accumulator = first.value;
        index = 1;
    }
    while (true) {
        const step = this.next();
        if (step.done) break;
        accumulator = callbackfn(accumulator as U | T, step.value, index++);
    }
    return accumulator as U | T;
}

function iteratorToArray<T>(this: IteratorObject<T, undefined, unknown>): T[] {
    const result: T[] = [];
    while (true) {
        const step = this.next();
        if (step.done) break;
        result.push(step.value);
    }
    return result;
}

function iteratorForEach<T>(
    this: IteratorObject<T, undefined, unknown>,
    callbackfn: (value: T, index: number) => void
): void {
    let index = 0;
    while (true) {
        const step = this.next();
        if (step.done) break;
        callbackfn(step.value, index++);
    }
}

function iteratorSome<T>(
    this: IteratorObject<T, undefined, unknown>,
    predicate: (value: T, index: number) => unknown
): boolean {
    let index = 0;
    while (true) {
        const step = this.next();
        if (step.done) return false;
        if (predicate(step.value, index++)) return true;
    }
}

function iteratorEvery<T>(
    this: IteratorObject<T, undefined, unknown>,
    predicate: (value: T, index: number) => unknown
): boolean {
    let index = 0;
    while (true) {
        const step = this.next();
        if (step.done) return true;
        if (!predicate(step.value, index++)) return false;
    }
}

function iteratorFind<T, S extends T>(
    this: IteratorObject<T, undefined, unknown>,
    predicate: (value: T, index: number) => value is S
): S | undefined;
function iteratorFind<T>(
    this: IteratorObject<T, undefined, unknown>,
    predicate: (value: T, index: number) => unknown
): T | undefined;
function iteratorFind<T>(
    this: IteratorObject<T, undefined, unknown>,
    predicate: (value: T, index: number) => unknown
): T | undefined {
    let index = 0;
    while (true) {
        const step = this.next();
        if (step.done) return undefined;
        if (predicate(step.value, index++)) return step.value;
    }
}

function toIteratorObject<U>(
    value:
        | Iterator<U, unknown, undefined>
        | Iterable<U, unknown, undefined>
        | undefined
): IteratorObject<U, undefined, unknown> {
    if (value && typeof (value as Iterator<U>).next === "function") {
        return value as IteratorObject<U, undefined, unknown>;
    }
    if (
        value &&
        typeof (value as Iterable<U>)[Symbol.iterator] === "function"
    ) {
        const iter = (value as Iterable<U>)[Symbol.iterator]();
        if (iter && typeof iter.next === "function") {
            return iter as IteratorObject<U, undefined, unknown>;
        }
    }
    throw new TypeError(
        "flatMap() callback must return an iterator or iterable"
    );
}
