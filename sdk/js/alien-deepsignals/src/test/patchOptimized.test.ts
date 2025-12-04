// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { describe, it, expect, beforeEach } from "vitest";
import { deepSignal } from "../deepSignal";
import { watch } from "../watch";

// Goal: demonstrate that patchOptimized deep watch performs fewer traversals
// than standard deep watch for the same batch of nested mutations.
// We use the exported __traverseCount instrumentation to measure how many
// times traverse() executes under each strategy.

describe("watch patch-only simplified performance placeholder", () => {
    let store: any;
    const build = (breadth = 3, depth = 3) => {
        const make = (d: number): any => {
            if (d === 0) return { v: 0 };
            const obj: any = {};
            for (let i = 0; i < breadth; i++) obj["k" + i] = make(d - 1);
            return obj;
        };
        return make(depth);
    };

    beforeEach(() => {
        store = deepSignal(build());
    });

    function mutateAll(breadth = 3, depth = 3) {
        const visit = (node: any, d: number) => {
            if (d === 0) {
                node.v++;
                return;
            }
            for (let i = 0; i < breadth; i++) visit(node["k" + i], d - 1);
        };
        visit(store, depth);
    }

    it("receives a single batch of patches after deep mutations", async () => {
        let batches = 0;
        const { stopListening: stop } = watch(store, ({ patches }) => {
            if (patches.length) batches++;
        });
        mutateAll();
        await Promise.resolve();
        expect(batches).toBe(1);
        stop();
    });
});
