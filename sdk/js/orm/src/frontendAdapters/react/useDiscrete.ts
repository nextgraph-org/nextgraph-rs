// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useEffect, useMemo, useRef } from "react";
import { DiscreteOrmConnection } from "../../connector/discrete/discreteOrmConnectionHandle.ts";
import { useDeepSignal } from "@ng-org/alien-deepsignals/react";
import { DeepSignal } from "@ng-org/alien-deepsignals";
import { DiscreteArray, DiscreteObject } from "../../types.ts";

export function useDiscrete(documentId: string) {
    const prevOrmConnection = useRef<undefined | DiscreteOrmConnection>(
        undefined
    );

    const ormConnection = useMemo(() => {
        if (prevOrmConnection.current) prevOrmConnection.current.close();
        const newOrmConnection = DiscreteOrmConnection.getOrCreate(documentId);
        prevOrmConnection.current = newOrmConnection;
        return newOrmConnection;
    }, [documentId]);

    useEffect(() => {
        if (!ormConnection) return;

        return () => {
            ormConnection.close();
        };
    }, [ormConnection]);

    // Use react hook for listening to signal object changes
    // (i.e. changes from backend or another component using the object).
    // When establishing a connection, we don't have an object yet but
    // we can't pass undefined to `useDeepSignal`. So we pass an empty dummy object (`{}`)
    // but don't return it in the hook.
    const state = useDeepSignal(ormConnection.signalObject ?? {}) as DeepSignal<
        DiscreteArray | DiscreteObject
    >;
    const returnState = ormConnection.signalObject ? state : undefined;

    return { data: returnState };
}
