// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { OrmConnection } from "./connector/ormConnectionHandler.ts";
import { DiscreteOrmConnection } from "./connector/discrete/discreteOrmConnectionHandler.ts";
import {
    useShape as svelteUseShape,
    useDiscrete as svelteUseDiscrete,
} from "./frontendAdapters/svelte/index.ts";
import {
    useShape as reactUseShape,
    useDiscrete as reactUseDiscrete,
} from "./frontendAdapters/react/index.ts";
import {
    useShape as vueUseShape,
    useDiscrete as vueUseDiscrete,
} from "./frontendAdapters/vue/index.ts";
import { initNgSignals, ngSession } from "./connector/initNg.ts";
import { insertObject } from "./connector/insertObject.ts";
import { getObjects } from "./connector/getObjects.ts";
export * from "./connector/applyPatches.ts";

export type { DeepSignal, DeepSignalObject } from "@ng-org/alien-deepsignals";

export { getRaw, watch, effect } from "@ng-org/alien-deepsignals";

export {
    initNgSignals as initNg,
    ngSession,
    OrmConnection,
    DiscreteOrmConnection,
    svelteUseShape,
    svelteUseDiscrete,
    reactUseShape,
    reactUseDiscrete,
    vueUseShape,
    vueUseDiscrete,
    insertObject,
    getObjects,
};
