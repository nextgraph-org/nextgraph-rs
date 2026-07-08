// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { describe, test, expect } from "vitest";
import { applyPatches, Patch } from "../connector/applyPatches.ts";

/**
 * Build a patch path string from segments (auto-prefix /)
 */
function p(...segs: (string | number)[]) {
    return "/" + segs.map(String).join("/");
}

describe("applyDiff - object & literal operations", () => {
    test("add primitive value", () => {
        const state: any = { address: {} };
        const diff: Patch[] = [
            { op: "add", path: p("address", "street"), value: "1st" },
        ];
        applyPatches(state, diff);
        expect(state.address.street).toBe("1st");
    });
    test("overwrite primitive value", () => {
        const state: any = { address: { street: "old" } };
        const diff: Patch[] = [
            { op: "add", path: p("address", "street"), value: "new" },
        ];
        applyPatches(state, diff);
        expect(state.address.street).toBe("new");
    });
    test("remove primitive", () => {
        const state: any = { address: { street: "1st", country: "Greece" } };
        const diff: Patch[] = [{ op: "remove", path: p("address", "street") }];
        applyPatches(state, diff);
        expect(state.address.street).toBeUndefined();
        expect(state.address.country).toBe("Greece");
    });
    test("remove object branch", () => {
        const state: any = { address: { street: "1st" }, other: 1 };
        const diff: Patch[] = [{ op: "remove", path: p("address") }];
        applyPatches(state, diff);
        expect(state.address).toBeUndefined();
        expect(state.other).toBe(1);
    });
    test("add object", () => {
        const state: any = { other: 1 };
        const diff: Patch[] = [
            { op: "add", path: p("address"), value: { street: "1st street" } },
        ];
        applyPatches(state, diff);
        expect(state.address).toEqual({ street: "1st street" });
        expect(state.other).toBe(1);
    });
});

describe("applyDiff - array operations", () => {
    test("appends items to an array", () => {
        let obj = [1, 2, 3, 4, 5];
        applyPatches(obj, [{ op: "add", path: "/-", value: 6 }]);
        expect(obj).toEqual([1, 2, 3, 4, 5, 6]);
    });
    test("removes last item from array", () => {
        let obj = [1, 2, 3, 4, 5];
        // remove last
        applyPatches(obj, [{ op: "remove", path: "/-" }]);
        expect(obj).toEqual([1, 2, 3, 4]);
    });

    test("inserts item in array", () => {
        let obj = [1, 2, 3, 4, 5];
        applyPatches(obj, [{ op: "add", path: "/1", value: 0 }]);
        expect(obj).toEqual([1, 0, 2, 3, 4, 5]);
    });
    test("removes item from array", () => {
        let obj = [1, 2, 3, 4, 5];
        applyPatches(obj, [{ op: "remove", path: "/1" }]);
        expect(obj).toEqual([1, 3, 4, 5]);
    });
});
