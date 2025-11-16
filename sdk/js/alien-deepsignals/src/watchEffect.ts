// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { effect as coreEffect } from "./core";
/** Run a reactive function and re-run on its dependencies; supports cleanup. */
export function watchEffect(
  fn: (registerCleanup?: (cleanup: () => void) => void) => void
) {
  let cleanup: (() => void) | undefined;
  const registerCleanup = (cb: () => void) => {
    cleanup = cb;
  };
  const stop = coreEffect(() => {
    if (cleanup) {
      try {
        cleanup();
      } catch {
        /* ignore */
      } finally {
        cleanup = undefined;
      }
    }
    fn(registerCleanup);
  });
  return () => {
    if (cleanup) {
      try {
        cleanup();
      } catch {
        /* ignore */
      }
    }
    stop();
  };
}
