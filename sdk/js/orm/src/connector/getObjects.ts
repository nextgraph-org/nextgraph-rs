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
import { getRaw } from "@ng-org/alien-deepsignals";
import { RdfOrmConfig, Snapshot } from "../utilTypes.ts";

/**
 * Utility for retrieving objects once without establishing a two-way subscription.
 *
 * @param shapeType The shape type of the objects to be retrieved.
 * @param conf The config that can be a document nuri or {@link RdfOrmConfig} (excluding pagination).
 * @returns A set of all objects matching the shape and scope
 */
export async function getObjects<
    T extends BaseType,
    const C extends Omit<RdfOrmConfig<T>, "pageSize" | "maxActivePages">,
>(shapeType: ShapeType<T>, config: C) {
    const connection = RdfOrmSubscription.getOrCreate(shapeType, config);

    await connection.readyPromise;

    setTimeout(() => {
        connection.close();
    }, 1_000);

    return structuredClone(getRaw(connection.signalObject)) as Snapshot<
        (typeof connection)["signalObject"]
    >;
}
