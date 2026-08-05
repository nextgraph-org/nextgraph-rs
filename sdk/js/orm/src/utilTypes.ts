// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { BaseType } from "@ng-org/shex-orm";
import { Scope } from "./types.ts";
import { RdfOrmSubscription } from "./core.ts";
import {
    DeepSignal,
    DeepSignalSet,
    ReadOnlyArray,
} from "@ng-org/alien-deepsignals";

type ValueOf<T> = T[keyof T];

type LiteralProps<T extends BaseType> = ValueOf<{
    [K in Exclude<keyof T, "@id" | "@graph">]: T[K] extends
        | string
        | boolean
        | number
        | Set<string>
        | Set<number>
        | Set<boolean>
        ? K
        : never;
}>;
type ObjectProps<T extends BaseType> = ValueOf<{
    [K in Exclude<keyof T, "@id" | "@graph">]: T[K] extends object | Set<object>
        ? K
        : never;
}>;

/** Used in {@link RdfOrmConfig}. */
export type WhereConfig<T extends BaseType> = {
    [P in LiteralProps<T>]?: T[P] extends Set<infer S>
        ? S | NonEmptyArray<S>
        : T[P] | NonEmptyArray<T[P]>;
} & {
    [P in ObjectProps<T>]?: T[P] extends Set<infer S extends BaseType>
        ? WhereConfig<S>
        : WhereConfig<T[P]>;
};

type SingleKeyObject<T extends Record<string, unknown>> = {
    [K in keyof T]: { [_ in K]: T[K] } & { [_ in Exclude<keyof T, K>]?: never };
}[keyof T];

type NonEmptyArray<T> = [T, ...T[]];

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
export type OrderByConfig<T extends BaseType> =
    | NonEmptyArray<OrderByConfigObject<T>>
    | OrderByConfigObject<T>;
export type OrderByConfigObject<T extends BaseType> = SingleKeyObject<{
    [K in Exclude<keyof T, "@graph" | "@id">]: T[K] extends
        | string
        | number
        | boolean
        ? "asc" | "desc"
        : never;
}>;

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
     * ```
     */
    where?: WhereConfig<T>;

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

/** The data type of signal objects depending on the OrmConfig. */
export type SubscriptionData<
    T extends BaseType,
    CONF extends RdfOrmConfig<any>,
> = undefined extends CONF["orderBy"]
    ? DeepSignalSet<T>
    : DeepSignal<ReadOnlyArray<T>>;

// ==========
// Type tests
// ==========
interface TestType {
    readonly "@graph": string;
    readonly "@id": string;
    stringProp: string;
    numProp: number;
    boolProp: boolean;
    setProp: Set<string>;
    objProp: { "@id": string; "@graph": string; foo: string };
    obj2Prop: Set<{ "@id": string; "@graph": string; bar: string | number }>;
    enumProp: "choice1" | "choice2";
}

// OrderByConfig type tests

type TestTypeOrderByConf = OrderByConfig<TestType>;

const test1ObConf0: TestTypeOrderByConf = {
    stringProp: "asc",
};
const test1ObConf1: TestTypeOrderByConf = {
    boolProp: "asc",
};
const test1ObConf2: TestTypeOrderByConf = [
    {
        boolProp: "asc",
    },
];
const test1ObConf3: TestTypeOrderByConf = [
    {
        boolProp: "asc",
    },
    { enumProp: "desc" },
];
const test1ObConf4: TestTypeOrderByConf = {
    numProp: "asc",
};
const test1ObConf5: TestTypeOrderByConf = {
    // @ts-expect-error
    objProp: "asc",
};
const test1ObConf6: TestTypeOrderByConf = {
    // @ts-expect-error
    setProp: "asc",
};
// @ts-ignore
const test1ObConf7: TestTypeOrderByConf = {
    boolProp: "asc",
    // @ts-ignore
    numProp: "desc",
};

// WhereConfig type tests

function testWhereConf(_conf: WhereConfig<TestType>) {}
testWhereConf({
    enumProp: ["choice1", "choice2"],
    boolProp: true,
    numProp: [3, 4],
    stringProp: "foo",
    setProp: "mau",
    objProp: {
        foo: "3",
    },
    obj2Prop: {
        bar: 2,
    },
});
testWhereConf({
    // @ts-expect-error
    enumProp: ["choice1", "choice3"],
    // @ts-expect-error
    boolProp: "true",
    // @ts-expect-error
    stringProp: [],
    objProp: {
        // @ts-expect-error
        foo: true,
    },
    // @ts-ignore
    obj2Prop: 2,
    // @ts-ignore
    "@graph": "some:id",
});
