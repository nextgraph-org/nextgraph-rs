// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { computed, MaybeRefOrGetter, onBeforeUnmount, toValue } from "vue";
import { type DeepSignal } from "@ng-org/alien-deepsignals";
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";
import { DiscreteOrmConnection } from "../../connector/discrete/discreteOrmConnectionHandler.ts";
import { DiscreteArray, DiscreteObject } from "../../types.ts";

const EMPTY_OBJECT = {} as const;

export function useDiscrete(documentId: MaybeRefOrGetter<string | undefined>) {
    const ormConnection = computed(() => {
        const id = toValue(documentId);
        return id ? DiscreteOrmConnection.getOrCreate(id) : undefined;
    });

    onBeforeUnmount(() => {
        ormConnection?.value?.close();
    });

    const signalSource = computed(
        () => ormConnection.value?.signalObject ?? EMPTY_OBJECT
    );

    const state = useDeepSignal(signalSource) as DeepSignal<
        DiscreteArray | DiscreteObject
    >;

    const data = computed(() =>
        ormConnection.value?.signalObject ? state : undefined
    );

    return { data };
}
