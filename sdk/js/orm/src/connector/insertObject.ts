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
import { OrmConnection } from "./ormConnectionHandler.ts";

/**
 * Utility for adding ORM-typed objects to the database without the need for subscribing to documents.
 * @param shapeType The shape type of the objects to be inserted.
 * @param object The object to be inserted.
 */
export async function insertObject<T extends BaseType>(
    shapeType: ShapeType<T>,
    object: T
) {
    const connection = OrmConnection.getOrCreate(shapeType, {
        graphs: [], // Subscribe to no documents
    });
    await connection.readyPromise;
    connection.signalObject.add(object);

    connection.close();
}
