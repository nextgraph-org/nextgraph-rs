// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { _rawEffect } from "./core";

type RegisterCleanup = (cleanup: () => void) => void;

/** Wrap `alien-signals` effect with optional cleanup registration. */
export function effect(run: (registerCleanup?: RegisterCleanup) => void) {
    let cleanup: (() => void) | undefined;
    const registerCleanup: RegisterCleanup = (fn) => {
        cleanup = fn;
    };

    const stop = _rawEffect(() => {
        if (cleanup) {
            try {
                cleanup();
            } finally {
                cleanup = undefined;
            }
        }
        run(registerCleanup);
    });

    return () => {
        if (cleanup) {
            try {
                cleanup();
            } finally {
                cleanup = undefined;
            }
        }
        stop();
    };
}
