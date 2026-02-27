// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { OrmSubscription } from "./connector/ormSubscriptionHandler.ts";
import { DiscreteOrmSubscription } from "./connector/discrete/discreteOrmSubscriptionHandler.ts";
import { initNgSignals, ngSession } from "./connector/initNg.ts";
import { insertObject } from "./connector/insertObject.ts";
import { getObjects } from "./connector/getObjects.ts";

export * from "./types.ts";

export type {
    DeepSignal,
    DeepSignalObject,
    DeepSignalSet,
} from "@ng-org/alien-deepsignals";

export { getRaw, watch, effect } from "@ng-org/alien-deepsignals";

export {
    initNgSignals as initNg,
    ngSession,
    OrmSubscription,
    DiscreteOrmSubscription,
    insertObject,
    getObjects,
};
