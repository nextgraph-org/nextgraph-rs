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
import { DiscreteOrmConnection } from "../../connector/discrete/discreteOrmConnectionHandler.ts";
import { useDeepSignal } from "@ng-org/alien-deepsignals/react";
import { DeepSignal } from "@ng-org/alien-deepsignals";
import { DiscreteArray, DiscreteObject } from "../../types.ts";

const EMPTY_OBJECT = {} as const;

export function useDiscrete(documentId: string | undefined) {
    const prevDocumentId = useRef<string | undefined>(undefined);
    const prevOrmConnection = useRef<DiscreteOrmConnection | undefined>(
        undefined
    );

    const ormConnection = useMemo(() => {
        // Close previous connection if documentId changed.
        if (
            prevOrmConnection.current &&
            prevDocumentId.current !== documentId
        ) {
            prevOrmConnection.current.close();
            prevOrmConnection.current = undefined;
        }

        // If no documentId, return undefined.
        if (!documentId) {
            prevDocumentId.current = undefined;
            return undefined;
        }

        // Create new connection only if needed.
        if (
            !prevOrmConnection.current ||
            prevDocumentId.current !== documentId
        ) {
            prevOrmConnection.current =
                DiscreteOrmConnection.getOrCreate(documentId);
            prevDocumentId.current = documentId;
        }

        return prevOrmConnection.current;
    }, [documentId]);

    useEffect(() => {
        return () => {
            prevOrmConnection.current?.close();
        };
    }, []);

    // useDeepSignal requires an object, so pass empty object when no connection.
    const signalSource = ormConnection?.signalObject ?? EMPTY_OBJECT;
    const state = useDeepSignal(signalSource) as DeepSignal<
        DiscreteArray | DiscreteObject
    >;

    // Only return data if we have a valid connection with a signal object.
    const data = ormConnection?.signalObject ? state : undefined;

    return { data };
}
