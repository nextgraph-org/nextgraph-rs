// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import {
    startBatch as alienStartBatch,
    endBatch as alienEndBatch,
    computed as alienComputed,
    signal as alienSignal_,
    effect as alienEffect,
} from "alien-signals";

/**
 * Execute multiple signal writes in a single batched update frame.
 * All downstream computed/effect re-evaluations are deferred until the function exits.
 *
 * IMPORTANT: The callback must be synchronous. If it returns a Promise the batch will
 * still end immediately after scheduling, possibly causing mid-async flushes.
 *
 * @example
 * ```ts
 * batch(() => {
 *   count(count() + 1);
 *   other(other() + 2);
 * }); // effects observing both run only once
 * ```
 */
export function batch<T>(fn: () => T): T {
    alienStartBatch();
    try {
        return fn();
    } finally {
        alienEndBatch();
    }
}

/**
 * Re-export of alien-signals computed function.
 *
 * Use the `computed()` function to create lazy derived signals that automatically
 * track their dependencies and recompute only when needed.
 *
 * Key features:
 * - **Lazy evaluation**: The computation runs only when you actually read the computed value.
 *     If you never access `fullName()`, the concatenation never happens—no wasted CPU cycles.
 * - **Automatic caching**: Once computed, the result is cached until a dependency changes.
 *     Multiple reads return the cached value without re-running the getter.
 * - **Fine-grained reactivity**: Only recomputes when its tracked dependencies change.
 *     Unrelated state mutations don't trigger unnecessary recalculation.
 * - **Composable**: Computed signals can depend on other computed signals,
 *     forming efficient dependency chains.
 *
 * @example
 * ```ts
 * import { computed } from "@ng-org/alien-deepsignals";
 *
 * const state = deepSignal({
 *     firstName: "Ada",
 *     lastName: "Lovelace",
 *     items: [1, 2, 3],
 * });
 *
 * // Create a computed signal that derives from reactive state
 * const fullName = computed(() => `${state.firstName} ${state.lastName}`);
 *
 * console.log(fullName()); // "Ada Lovelace" - computes on first access
 *
 * state.firstName = "Grace";
 * console.log(fullName()); // "Grace Lovelace" - recomputes automatically
 *
 * // Expensive computation only runs when accessed and dependencies change
 * const expensiveResult = computed(() => {
 *     console.log("Computing...");
 *     return state.items.reduce((sum, n) => sum + n * n, 0);
 * });
 *
 * // No computation happens yet!
 * state.items.push(4);
 * // Still no computation...
 *
 * console.log(expensiveResult()); // "Computing..." + result
 * console.log(expensiveResult()); // Cached, no log
 * state.items.push(5);
 * console.log(expensiveResult()); // "Computing..." again (dependency changed)
 *
 * ```
 */
export const computed = alienComputed;

/**
 * Re-export of alien-signals `signal` function which creates a basic signal.
 */
export const alienSignal = alienSignal_;

/**
 * Re-export of alien-signals effect function.
 *
 * Callback reruns on every signal modification that is used within its callback.
 *
 */
export const effect = alienEffect;
