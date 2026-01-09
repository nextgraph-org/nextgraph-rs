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
import { useDeepSignal } from "@ng-org/alien-deepsignals/react";
import type { ShapeType } from "@ng-org/shex-orm";
import { useEffect, useMemo } from "react";
import type { Scope } from "../../types.ts";
import { OrmConnection } from "../../connector/ormConnectionHandler.ts";
import { DeepSignalSet } from "@ng-org/alien-deepsignals";

/**
 *
 * @param shape The shape type
 * @param scope The scope as graph, array of graphs or scope object with graphs and subjects.
 * @returns A deep signal set with the orm objects, an empty set if still loading,
 *          or an empty set which errors on modifications if scope is undefined.
 */
const useShape = <T extends BaseType>(
    shape: ShapeType<T>,
    scope: Scope | string[] | string = {}
) => {
    const parsedScope =
        typeof scope === "string"
            ? { graphs: [scope] }
            : Array.isArray(scope)
              ? { graphs: scope }
              : scope;

    const ormConnection = useMemo(
        () =>
            scope === undefined
                ? undefined
                : OrmConnection.getOrCreate(shape, parsedScope),
        [shape, scope, parsedScope.graphs, parsedScope.subjects]
    );

    useEffect(() => {
        if (!ormConnection) return;

        return () => {
            ormConnection.close();
        };
    }, [ormConnection]);

    const state = useDeepSignal(ormConnection?.signalObject ?? readOnlySet);

    return state as DeepSignalSet<T>;
};

const readOnlySet = new Proxy(new Set(), {
    get(target, key, receiver) {
        if (key === "add" || key === "delete" || key === "clear") {
            return () => {
                throw new Error("Set is readonly because scope is empty.");
            };
        }
        const value = (target as any)[key];
        if (typeof value === "function") {
            return value.bind(target);
        }
        return value;
    },
});

export default useShape;
