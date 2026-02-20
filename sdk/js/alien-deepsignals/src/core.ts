// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/** Lightweight facade adding ergonomic helpers (.value/.get/.set) to native alien-signals function signals. */

// Native re-exports for advanced usage.
export {
    signal as alienSignal,
    computed as alienComputed,
    startBatch as alienStartBatch,
    endBatch as alienEndBatch,
    getCurrentSub as alienGetCurrentSub,
    setCurrentSub as alienSetCurrentSub,
    effect as alienEffect,
} from "alien-signals";

import {
    startBatch as alienStartBatch,
    endBatch as alienEndBatch,
} from "alien-signals";

/**
 * Execute multiple signal writes in a single batched update frame.
 * All downstream computed/effect re-evaluations are deferred until the function exits.
 *
 * IMPORTANT: The callback MUST be synchronous. If it returns a Promise the batch will
 * still end immediately after scheduling, possibly causing mid-async flushes.
 *
 * @example
 * batch(() => {
 *   count(count() + 1);
 *   other(other() + 2);
 * }); // effects observing both run only once
 */
export function batch<T>(fn: () => T): T {
    alienStartBatch();
    try {
        return fn();
    } finally {
        alienEndBatch();
    }
}
