import { computed, signal } from "./core";

/** Deep mutation emitted from a deepSignal root. */
export type DeepPatch = {
    path: (string | number)[];
} & (
    | { op: "add"; type?: "object" | "set"; value?: any }
    | { op: "remove"; type?: "set"; value?: any }
);

/** Batched patch payload tagged with a monotonically increasing version. */
export interface DeepPatchBatch {
    version: number;
    patches: DeepPatch[];
}

/** Batched patch payload for justInTime listeners. */
export interface DeepPatchJITBatch {
    patches: DeepPatch[];
}

export type DeepPatchSubscriber = (batch: DeepPatchBatch) => void;
export type DeepPatchJITSubscriber = (batch: DeepPatchJITBatch) => void;

export interface DeepSignalOptions {
    propGenerator?: DeepSignalPropGenFn;
    syntheticIdPropertyName?: string;
    readOnlyProps?: string[];
}

export type DeepSignalPropGenFn = (props: {
    path: (string | number)[];
    inSet: boolean;
    object: any;
}) => {
    syntheticId?: string | number;
    extraProps?: Record<string, unknown>;
};

export interface ProxyMeta {
    raw: object;
    parent?: ProxyMeta;
    key?: string | number | symbol;
    isSyntheticId?: boolean;
    root: symbol;
    options: DeepSignalOptions;
    setInfo?: SetMeta;
}

export interface SetMeta {
    idForObject: WeakMap<object, string>;
    objectForId: Map<string, object>;
}

export interface RootState {
    options?: DeepSignalOptions;
    version: number;
    justInTimeListeners: Set<DeepPatchJITSubscriber>;
    listeners: Set<DeepPatchSubscriber>;
    pendingPatches: DeepPatch[];
}

type WritableSignalFunction<T> = typeof signal<T>;
type ComputedSignalFunction<T> = typeof computed<T>;

export type WritableSignal<T = any> = ReturnType<WritableSignalFunction<T>>;
export type ComputedSignal<T = any> = ReturnType<ComputedSignalFunction<T>>;
export type SignalLike<T = any> = WritableSignal<T> | ComputedSignal<T>;

/** Raw and meta key. */
export type DeepSignalObjectProps<T> = {
    __raw__: T;
    __meta__: ProxyMeta;
};

/** Utility functions for sets. */
export type DeepSignalSetProps<T> = {
    /** Get the element that was first inserted into the set. */
    first(): undefined | (T extends object ? DeepSignal<T> : T);

    /**
     * Retrieve an entry from the Set by its synthetic ID.
     * @param id - The synthetic ID (string or number) assigned to the entry.
     * @returns The proxied entry if found, undefined otherwise.
     */
    getById(id: string | number): DeepSignal<T> | undefined;
    /**
     * Retrieve an entry from the Set by constructing an ID from graphIri and subjectIri.
     * This is a convenience method that constructs the ID as "graphIri|subjectIri".
     * @param graphIri - The graph IRI part of the identifier.
     * @param subjectIri - The subject IRI part of the identifier.
     * @returns The proxied entry if found, undefined otherwise.
     */
    getBy(graphIri: string, subjectIri: string): DeepSignal<T> | undefined;
};

/** Reactive Set wrapper that accepts raw or proxied entries. */
export interface DeepSignalSet<T>
    extends Set<DeepSignal<T>>,
        DeepSignalObjectProps<Set<T>>,
        SetIterator<DeepSignal<T>>,
        DeepSignalSetProps<T> {
    add(value: T | DeepSignal<T>): this;
    delete(value: T | DeepSignal<T>): boolean;
    has(value: T | DeepSignal<T>): boolean;
    forEach(
        callbackfn: (
            value: DeepSignal<T>,
            value2: DeepSignal<T>,
            set: DeepSignalSet<T>
        ) => void,
        thisArg?: any
    ): void;
    forEach(
        callbackfn: (value: DeepSignal<T>, index: number) => void,
        thisArg?: any
    ): void;
}

/**
 * The object returned by the @see deepSignal function.
 * It is decorated with utility functions for sets and a
 * `__raw__` prop to get the underlying non-reactive object
 * and `__meta__` prop, to get the internal metadata.
 */
export type DeepSignal<T> = T extends Function
    ? T
    : T extends string | number | boolean
      ? T
      : T extends DeepSignalObjectProps<any> | DeepSignalObjectProps<any>[]
        ? T
        : T extends Array<infer I>
          ? DeepSignal<I>[]
          : T extends Set<infer S>
            ? DeepSignalSet<S>
            : T extends object
              ? DeepSignalObject<T>
              : T;

export type DeepSignalObject<T extends object> = {
    [K in keyof T]: DeepSignal<T[K]>;
};

export type RevertDeepSignal<T> = T extends DeepSignal<infer S> ? S : T;
