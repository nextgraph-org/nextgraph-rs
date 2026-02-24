// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import * as NG from "@ng-org/lib-wasm";

/** A NextGraph session with an engine. */
export type Session = {
    session_id: string | number;
    protected_store_id: string;
    private_store_id: string;
    public_store_id: string;
    ng: typeof NG;
    [key: string]: unknown;
};

let resolveNgSession: (value: { ng: typeof NG; session: Session }) => void;

/** Resolves to the NG session and the ng implementation. */
export const ngSession = new Promise<{ ng: typeof NG; session: Session }>(
    (resolve) => {
        resolveNgSession = resolve;
    }
);

/**
 * Initialize the ORM by passing the ng implementation and session.
 *
 * **This is the first thing you need to to before using the ORM.**
 *
 * @param ngImpl The NextGraph API, e.g. exported from `@ng-org/web`.
 * @param session The established NextGraph session.
 *
 * @example
 * ```typescript
 * import { ng, init } from "@ng-org/web";
 * import { initNg as initNgSignals, Session } from "@ng-org/orm";
 * let session: Session;
 *
 * // Call as early as possible as it will redirect to the auth page.
 * await init(
 *     async (event: any) => {
 *         session = event.session;
 *         session!.ng ??= ng;
 *
 *         // Call initNgSignals
 *         initNgSignals(ng, session);
 *     },
 *     true,
 *     []
 * );
 * ```
 *
 */
export function initNgSignals(ngImpl: typeof NG, session: Session) {
    resolveNgSession({ ng: ngImpl, session });
}
