// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { BaseType, ShapeType } from "@ng-org/shex-orm";
import { RdfOrmSubscription } from "./RdfOrmSubscription.ts";
import { RAW_KEY } from "@ng-org/alien-deepsignals";

/**
 * Utility for adding ORM-typed objects to the database without
 * the need for subscribing to documents using an {@link RdfOrmSubscription}.
 *
 * @param shapeType The shape type of the objects to be inserted.
 * @param object The object to be inserted. The `@graph`must be set.
 *     It is recommended to set `@id` to `""` or leave it `undefined`, to auto-generate a unique NURI.
 *
 * @returns the inserted object. If `@id` was set to `""` or `undefined`, it's now set to an auto-generated NURI.
 *     This is true for nested objects as well. For nested objects, the `@graph`, if unset, will be set to the parent's `@graph`.
 */
export async function insertObject<T extends BaseType>(
    shapeType: ShapeType<T>,
    object: T
): Promise<T> {
    const connection = RdfOrmSubscription.getOrCreate(shapeType, {
        graphs: [], // Subscribe to no documents
    });
    await connection.readyPromise;
    // Makes TypeScript happy since it has limited understanding of T (ts limitation).
    connection.signalObject.add(object as Exclude<T, undefined>);

    connection.close();

    return connection.signalObject.first()![RAW_KEY];
}
