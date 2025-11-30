// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { describe, expect, it } from "vitest";
import { deepSignal } from "../deepSignal";
import { watch } from "../watch";

describe("watch", () => {
    it("watch immediate", () => {
        const store = deepSignal({
            userinfo: {
                name: "tom",
            },
        });
        let val!: string;
        watch(
            store,
            ({ newValue }) => {
                val = newValue.userinfo.name;
            },
            { immediate: true }
        );
        expect(val).toEqual("tom");
    });
    it("watch deep", () => {
        const store = deepSignal({
            userinfo: {
                name: "tom",
            },
        });
        let val!: string;
        watch(
            store,
            ({ newValue }) => {
                val = newValue.userinfo.name;
            },
            { immediate: true }
        );
        let value2!: string;
        watch(
            store,
            ({ newValue }) => {
                value2 = newValue.userinfo.name;
            },
            { immediate: true }
        );
        expect(val).toEqual("tom");
        store.userinfo.name = "jon";
        // patch delivery async (microtask)
        return Promise.resolve().then(() => {
            expect(val).toEqual("jon");
            // With refactored watch using native effect, shallow watcher now also updates root reference
            expect(value2).toEqual("jon");
        });
    });

    it("watch once", () => {
        const store = deepSignal({
            userinfo: {
                name: "tom",
            },
        });
        let val!: string;
        watch(
            store,
            ({ newValue }) => {
                val = newValue.userinfo.name;
            },
            { immediate: true, once: true }
        );

        expect(val).toEqual("tom");
        store.userinfo.name = "jon";
        // once watcher shouldn't update after first run
        expect(val).toEqual("tom");
    });
});
