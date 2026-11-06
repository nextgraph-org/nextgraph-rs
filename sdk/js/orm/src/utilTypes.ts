// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { BaseType, Unsynced } from "@ng-org/shex-orm";
import { Scope } from "./types.ts";
import { RdfOrmSubscription } from "./core.ts";
import { DeepSignal, DeepSignalSet } from "@ng-org/alien-deepsignals";

type ValueOf<T> = T[keyof T];

type LiteralProps<T extends BaseType> = ValueOf<{
    [K in Exclude<keyof T, "@id" | "@graph">]: T[K] extends
        | string
        | boolean
        | number
        | Set<string>
        | Set<number>
        | Set<boolean>
        | undefined
        ? K
        : never;
}>;
type ObjectProps<T extends BaseType> = ValueOf<{
    [K in Exclude<keyof T, "@id" | "@graph">]: T[K] extends
        | BaseType
        | Set<BaseType>
        ? K
        : never;
}>;

/** @internal Used in {@link RdfOrmConfig}. */
export type WhereConfig<T extends BaseType> = {
    [P in LiteralProps<T>]?: T[P] extends Set<infer S> | undefined
        ? S | NonEmptyArray<Exclude<S, undefined>>
        : T[P] | NonEmptyArray<Exclude<T[P], undefined>>;
} & {
    [P in ObjectProps<T>]?: T[P] extends Set<infer S extends BaseType>
        ? IsUnion<S> extends true
            ? never
            : WhereConfig<S>
        : IsUnion<T[P]> extends true
          ? never
          : // Explicit Extract only necessary to make compiler happy.
            WhereConfig<Extract<T[P], BaseType>>;
};

/** @internal */
type SingleKeyObject<T extends Record<string, unknown>> = {
    [K in keyof T]: { [_ in K]: T[K] } & { [_ in Exclude<keyof T, K>]?: never };
}[keyof T];

type NonEmptyArray<T> = [T, ...T[]];

type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
    x: infer I
) => void
    ? I
    : never;

/**
 * Defines how results are sorted.
 *
 * Each property to sort by must be specified as object with the key being the property name
 * and the value being `"asc"`, `"desc"` or a nested orderBy object.
 *
 * The property to sort by must have a cardinality of exactly 1 (no optional values allowed).
 *
 * May be used as single object or array of objects if you want secondary ordering.
 *
 * For ordering by nested properties, see the example.
 *
 *
 * @example
 * ```jsonc
 * {
 *   orderBy: [
 *     { firstName: "asc"},
 *     { lastName: "asc"},
 *     { birthDate: "desc"}
 *   ],
 *   ...
 * }
 * // Or for sorting by nested properties:
 * {
 *   orderBy: {
 *     capital: { population: "desc" }
 *   }
 * }
 * ```
 */
export type OrderByConfig<T extends BaseType> =
    | NonEmptyArray<OrderByConfigObject<T>>
    | OrderByConfigObject<T>;
export type OrderByConfigObject<T extends BaseType> = SingleKeyObject<{
    [K in OrderableKeys<T>]: IsSinglePrimitive<T[K]> extends true
        ? "asc" | "desc"
        : T[K] extends BaseType
          ? OrderByConfig<T[K]>
          : never;
}>;

type OrderableKeys<T extends BaseType> = {
    [K in Exclude<keyof T, "@graph" | "@id">]: IsSinglePrimitive<
        T[K]
    > extends true
        ? K
        : T[K] extends BaseType
          ? K
          : never;
}[Exclude<keyof T, "@graph" | "@id">];

type IsSinglePrimitive<T> = [T] extends [string]
    ? true
    : [T] extends [number]
      ? true
      : [T] extends [boolean]
        ? true
        : [T] extends [Date]
          ? true
          : false;

// type SelectConfig<
//     ST extends ShapeType<any>,
//     SchemaIri extends keyof ST["schema"] = ST["shape"],
//     Pred extends
//         ST["schema"][string]["predicates"][number] = ST["schema"][SchemaIri]["predicates"][number],
// > = {
//     [P in Pred as P["readablePredicate"]]?: "shape" extends P["dataTypes"][number]["valType"]
//         ? // Nested shape?
//           // Only supported if there is a single nested shape
//           P["dataTypes"] extends [any]
//             ?
//                   | SelectConfig<
//                         ST,
//                         P["dataTypes"][number]["shape"] extends string
//                             ? P["dataTypes"][number]["shape"]
//                             : never
//                     >
//                   | boolean
//             : boolean
//         : // Basic type
//           boolean;
// };

/** Options for creating an {@link RdfOrmSubscription}. */
export type RdfOrmConfig<
    T extends BaseType,
    PS = number | undefined,
    OB = OrderByConfig<T> | undefined,
> = Scope & {
    /**
     * Properties or nested properties to filter by.
     *
     * @example
     * ```ts
     * {
     *    "name": ["Jon Doe", "Jane Doe"],
     *    "birthPlace": {
     *       "city": "Berlin"
     *    }
     * }
     * ```
     *
     * Note that when you specify a property value, this is equivalent to marking this property as `EXTRA` in the SHEX definition.
     * The equivalent SHEX expression for the above is:
     *
     * ```shex
     * ex:PersonShape EXTRA ex:name {
     *     ex:name [ "Jon Doe" "Jane Doe" ] ;
     *     # ... rest of shape
     * }
     * ex:PlaceShape EXTRA ex:city {
     *     ex:city [ "Berlin" ] ;
     *     # ... rest of shape
     * }
     * ```
     */
    where?: WhereConfig<T>;

    /** Property / Properties to sort data by. */
    orderBy?: OB;

    /** Optional subset of properties to query. */
    // select?: SelectConfig<ST>;

    /**
     * If set to a value greater than `0`, pagination is activated with the here specified size.
     * Use `nextPage()` or `previousPage()`, to load the next / previous items.
     *
     * Requires `orderBy` to be set.
     */
    pageSize?: OB extends undefined ? never : PS;
    /**
     * The number of pages after which loading the next page will discard the first one of the current window.
     * Leave undefined or set to 0, for no page disposal.
     * Note that once items are outside of the current window, they are not tracked and therefore
     * creations and invalidations do not cause "page shifts" - the first item in the window remains stable.
     *
     * Requires `pageSize` to be set.
     */
    maxActivePages?: PS extends undefined ? never : number;

    /**
     * Callback that is called when the ORM subscription fails to load or when errors occur
     * during operation. Errors do not necessarily impact the functioning of the subscription
     * but can cause a revert of made changes.
     */
    onError?: (error: Error) => void;

    /**
     * If false, no query is made. Useful in frontend components where not all data is available yet.
     * @default true
     */
    // enabled?: boolean;
};

/** The data type of signal objects depending on the OrmConfig. */
export type SubscriptionData<
    T extends BaseType,
    CONF extends RdfOrmConfig<any>,
> = undefined extends CONF["orderBy"]
    ? OrmSet<T>
    : DeepSignal<ReadonlyArray<T>>;

/**
 * A reactive set whose values are kept in sync with the database.
 * By its typing, it's identical to a DeepSignal. But if `T` is an object,
 * it allows adding `Unsynced` objects too (without `@graph` and `@id` too).
 */
export type OrmSet<T> = OrmSet_<T> & OrmIteratorHelpers<T> & OrmSetProps<T>;

// ======
// The following are in analogy to DeepSignal's set type
// that don't break separate getter and setters through type mapping.
// ======

/** @ignore */
export type OrmSetProps<T> = {
    add(value: T | Unsynced<T>): void;
} & {
    /** Get the element that was first inserted into the set. */
    first(): undefined | T;
} & (T extends object
        ? {
              /**
               * @internal This is only useful when you are using custom ids for sets.
               *           You should probably use {@link DeepSignalSetProps.getBy}.
               *
               * Retrieve an entry from the Set by its synthetic set ID.
               * @param id - The synthetic ID (string or number) assigned to the entry.
               * @returns The proxied entry if found, undefined otherwise.
               * @ignore
               */
              getById(id: string | number): T | undefined;

              /**
               * Retrieve an object from the Set by its `@graph` and `@id`.
               *
               * @param graphIri - The `@graph` NURI of the object.
               * @param subjectIri - The `@subject` IRI of the object.
               * @returns The proxied entry if found, undefined otherwise.
               */
              getBy(graphIri: string, subjectIri: string): T | undefined;
          }
        : {});

/**
 * Helper type to prevent excessive documentation to be generated for each property.
 * @ignore
 */
type OrmSet_<T> = Set<T> & {
    add(value: T | Unsynced<T>): OrmSet<T>;
    delete(value: T | Unsynced<T>): boolean;
    has(value: T | Unsynced<T>): boolean;
    forEach(
        callbackFn: (value: T, value2: T, set: OrmSet<T>) => void,
        thisArg?: any
    ): void;
};

type OrmIteratorHelpers<T> = Omit<
    IteratorObject<T>,
    // Exclude forEach because its signature is incompatible.
    "forEach"
>;

// ======

/** Represents a detached, non-reactive snapshot of an ORM object in the database. */
export type Snapshot<T> =
    T extends Set<infer I>
        ? Set<Snapshot<I>>
        : T extends ReadonlyArray<infer I> | Array<infer I>
          ? Array<Snapshot<I>>
          : T extends Partial<BaseType>
            ? BaseType & {
                  [K in Exclude<OptionalProps<T>, "@id" | "@graph">]?:
                      | undefined
                      | T[K] extends Set<any>
                      ? never
                      : Snapshot<T[K]>;
              } & {
                  [K in Exclude<
                      MandatoryProps<T>,
                      "@id" | "@graph"
                  >]: T[K] extends Set<any>
                      ? Snapshot<T[K]>
                      : undefined extends T[K]
                        ? never
                        : Snapshot<T[K]>;
              }
            : T;

type OptionalProps<T> = {
    [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];
type MandatoryProps<T> = Exclude<keyof T, OptionalProps<T>>;

/**
 * @internal
 * Utility type to make `nextPage()` and `previousPage()` properties optional,
 * if conf does not have `pageSize` or `maxActivePages`.
 */
export type WithMaybePagination<
    MAYBE_SHADOW,
    CONF extends RdfOrmConfig<T>,
    T extends BaseType,
> = undefined extends CONF["pageSize"]
    ? Omit<MAYBE_SHADOW, "nextPage" | "previousPage"> & {
          /**
           * Initializes loading of the next page.
           * This will update the data but you will not be called back on it.
           */
          nextPage?: () => void;
          /**
           * Initializes loading of the previous page.
           * This will update the data but you will not be called back on it.
           */
          previousPage?: () => void;
      } // No pagination functions.
    : undefined extends CONF["maxActivePages"] // Only forward pagination.
      ? Omit<MAYBE_SHADOW, "previousPage"> & {
            /**
             * Initializes loading of the previous page.
             * This will update the data but you will not be called back on it.
             */
            previousPage?: () => void;
        }
      : MAYBE_SHADOW; // Forward and backwards pagination.
