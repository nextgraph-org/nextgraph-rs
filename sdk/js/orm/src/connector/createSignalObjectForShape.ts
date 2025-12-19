// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { Diff, Scope } from "../types.ts";
import type { ShapeType, BaseType } from "@ng-org/shex-orm";
import { OrmConnection } from "./ormConnectionHandler.ts";

/**
 *
 * @param shapeType
 * @param scope
 * @returns
 */
export function createSignalObjectForShape<T extends BaseType>(
    shapeType: ShapeType<T>,
    scope?: Scope
) {
    const connection: OrmConnection<T> = OrmConnection.getConnection(
        shapeType,
        scope || ""
    );

    return {
        signalObject: connection.signalObject,
        stop: connection.release,
        readyPromise: connection.readyPromise,
    };
}
