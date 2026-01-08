// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { Scope } from "../../types.ts";
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";
import { onBeforeUnmount } from "vue";
import type { BaseType, ShapeType } from "@ng-org/shex-orm";
import { OrmConnection } from "../../connector/ormConnectionHandler.ts";

export function useShape<T extends BaseType>(
    shape: ShapeType<T>,
    scope: Scope = {}
) {
    const connection = OrmConnection.getOrCreate(shape, scope);

    // Cleanup
    onBeforeUnmount(() => {
        connection.close();
    });

    const ref = useDeepSignal(connection.signalObject);

    return ref;
}

export default useShape;
