// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { ng, init as initNgWeb } from "@ng-org/web";
import { DiscreteOrmSubscription, initNg as initNgSignals } from "@ng-org/orm";
import type * as NG from "@ng-org/lib-wasm";
import { loadStore } from "./loadStore";
import type { AllowedCrdt } from "../types";

export let session: NextGraphSession | undefined;

let resolveSessionPromise: (
    value: NextGraphSession | PromiseLike<NextGraphSession>
) => void;
let rejectSessionPromise: (reason?: any) => void;

export let sessionPromise: Promise<NextGraphSession> = new Promise(
    (resolve, reject) => {
        resolveSessionPromise = resolve;
        rejectSessionPromise = reject;
    }
);

export let PREFERRED_CRDT: AllowedCrdt;
export async function init(crdtIfNew: AllowedCrdt) {
    PREFERRED_CRDT = crdtIfNew;
    await initNgWeb(
        async (event: any) => {
            session = event.session;
            session!.ng ??= ng;
            resolveSessionPromise(session!);

            initNgSignals(ng, session!);
        },
        true,
        []
    ).catch((error) => {
        rejectSessionPromise(error);
    });
}

/** Initializes and keeps open the orm connection while the application is running. */
export let ormSubscriptionPromise = sessionPromise.then(async (session) => {
    const _store = await loadStore(PREFERRED_CRDT);
    ormSubscription = _store;
    return _store;
});
export let ormSubscription: DiscreteOrmSubscription | undefined = undefined;

export interface NextGraphSession {
    ng: typeof NG;
    session_id: string;
    protected_store_id: string;
    private_store_id: string;
    public_store_id: string;
    [key: string]: unknown;
}
