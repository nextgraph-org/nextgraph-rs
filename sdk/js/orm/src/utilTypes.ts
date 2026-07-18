// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type {
    BaseType,
    DataType,
    Predicate,
    ShapeType,
} from "@ng-org/shex-orm";
import { RootShapeType } from "./tests/shapes/orm/testShape.shapeTypes.ts";
import { Scope } from "./types.ts";
import { RdfOrmSubscription } from "./core.ts";
import {
    DeepSignalSet,
    ReadOnlyDeepSignalArray,
} from "@ng-org/alien-deepsignals";

/** The typescript equivalent for an ORM basic datatype (string, number, boolean, iri as string). */
type OrmDataTypeToType<DT extends DataType> =
    DT["literals"] extends Array<any>
        ? Array<DT["literals"][number]>
        : "string" extends DT["valType"]
          ? string
          : "number" extends DT["valType"]
            ? number
            : "boolean" extends DT["valType"]
              ? boolean
              : "iri" extends DT["valType"]
                ? string
                : "shape" extends DT["valType"]
                  ? object
                  : never;

type AllowedTypeFromPredicate<P extends Predicate> = OrmDataTypeToType<
    P["dataTypes"][number]
>;

type NonEmptyArray<T> = [T, ...T[]];
type FlattenArray<T> = T extends Array<infer C> ? FlattenArray<C> : T;
type AllowArray<T, S = FlattenArray<T>> = S | S[];

type WhereConfig<
    ST extends ShapeType<any>,
    SchemaIri extends keyof ST["schema"] = ST["shape"],
    Pred extends
        ST["schema"][string]["predicates"][number] = ST["schema"][SchemaIri]["predicates"][number],
> = {
    [P in Pred as P["readablePredicate"]]?: "shape" extends P["dataTypes"][number]["valType"]
        ? // Nested shape?
          // Only supported if there is a single nested shape
          P["dataTypes"] extends [any]
            ? WhereConfig<
                  ST,
                  P["dataTypes"][number]["shape"] extends string
                      ? P["dataTypes"][number]["shape"]
                      : never
              >
            : never
        : // Basic type
          AllowArray<
              | AllowedTypeFromPredicate<P>
              | { "|gt": AllowedTypeFromPredicate<P> }
              | { "|lt": AllowedTypeFromPredicate<P> }
              | {
                    "|lt": AllowedTypeFromPredicate<P>;
                    "|gt": AllowedTypeFromPredicate<P>;
                }
          >;
};

type SingleKeyObject<T extends Record<string, unknown>> = {
    [K in keyof T]: { [_ in K]: T[K] } & { [_ in Exclude<keyof T, K>]?: never };
}[keyof T];

/**
 * Defines how results are sorted.
 * Must contain a single property with the key being the property to sort by
 * and the value being `"asc"`, `"desc"`.
 * The property to sort by must have a cardinality of exactly 1.
 *
 * May be used as single object or array of objects if you want secondary ordering.
 *
 * @example
 * ```ts
 * {
 *   orderBy: [
 *     { firstName: "asc"},
 *     { lastName: "asc"},
 *     { birthDate: "desc"}
 *   ],
 *   ...
 * }
 * ```
 */
// TODO: Rust config requires them to be an array.
export type OrderByConfigObject<
    ST extends ShapeType<any>,
    SchemaIri extends keyof ST["schema"] = ST["shape"],
    Pred extends
        ST["schema"][string]["predicates"][number] = ST["schema"][SchemaIri]["predicates"][number],
> = SingleKeyObject<{
    [P in Pred as P["maxCardinality"] extends 1
        ? P["minCardinality"] extends 1
            ? P["readablePredicate"]
            : never
        : never]: "shape" extends P["dataTypes"][number]["valType"]
        ? //  No support for ordering by nested objects
          //  OrderByConfigObject<
          //       ST,
          //       P["dataTypes"][number]["shape"] extends string
          //           ? P["dataTypes"][number]["shape"]
          //           : never
          //   >
          never
        : "asc" | "desc";
}>;

type SelectConfig<
    ST extends ShapeType<any>,
    SchemaIri extends keyof ST["schema"] = ST["shape"],
    Pred extends
        ST["schema"][string]["predicates"][number] = ST["schema"][SchemaIri]["predicates"][number],
> = {
    [P in Pred as P["readablePredicate"]]?: "shape" extends P["dataTypes"][number]["valType"]
        ? // Nested shape?
          // Only supported if there is a single nested shape
          P["dataTypes"] extends [any]
            ?
                  | SelectConfig<
                        ST,
                        P["dataTypes"][number]["shape"] extends string
                            ? P["dataTypes"][number]["shape"]
                            : never
                    >
                  | boolean
            : boolean
        : // Basic type
          boolean;
};

/** Options for creating an {@link RdfOrmSubscription}. */
// TODO: Using ShapeTypes instead of the generated types might be overkill.
export type OrmConfig<
    ST extends ShapeType<any>,
    PS = number | undefined,
    OB = NonEmptyArray<OrderByConfigObject<ST>> | OrderByConfigObject<ST>,
> = Scope & {
    // where?: WhereConfig<ST>;

    /** Property / Properties to sort data by. */
    orderBy?: OB;

    /** Optional subset of properties to query. */
    // select?: SelectConfig<ST>;

    /**
     * If set to a value greater than `0`, pagination is activated with the here specified size.
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
     * If false, no query is made. Useful in frontend components where not all data is available yet.
     * @default true
     */
    // enabled?: boolean;
};

export type ObjectType<
    CONF extends OrmConfig<any>,
    T extends BaseType,
> = undefined extends CONF["orderBy"]
    ? DeepSignalSet<T>
    : ReadOnlyDeepSignalArray<T>;
