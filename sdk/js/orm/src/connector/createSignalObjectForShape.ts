// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { Scope } from "../types.ts";
import type { ShapeType, BaseType } from "@ng-org/shex-orm";
import { OrmConnection } from "./ormConnectionHandler.ts";

/**
 * Create a proxied orm object for a given shape type and scope.
 *
 * @param shapeType The shape type
 * @param scope An array of nuris which should be subscribed to.
 *      Leave it empty or set to `[""]` for scoping to the whole store.
 *      Setting it to `[]` will not result in any orm objects.
 *      You can still use it for adding new objects to the db.
 * @returns
 */
export function createSignalObjectForShape<T extends BaseType>(
    shapeType: ShapeType<T>,
    scope?: Scope
) {
    const connection: OrmConnection<T> = OrmConnection.getConnection(
        shapeType,
        scope || [""]
    );

    return {
        /** The set containing all orm objects. */
        signalObject: connection.signalObject,
        stop: connection.release,
        /** Resolves when the connection is ready. */
        readyPromise: connection.readyPromise,
        beginTransaction: connection.beginTransaction,
        commitTransaction: connection.commitTransaction,
    };
}
