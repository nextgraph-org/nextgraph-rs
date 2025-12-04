// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { describe, it, expect } from "vitest";
import { signal, computed, isSignal } from "../../core";
import { deepSignal } from "../../deepSignal";

describe("core.ts coverage", () => {
    it("signal tagging helpers (.value/.peek/.get/.set)", () => {
        const s: any = signal(1);
        expect(isSignal(s)).toBe(true);
        expect(s.value).toBe(1);
        expect(s.peek()).toBe(1);
        expect(s.get()).toBe(1);
        s.set(2);
        expect(s.value).toBe(2);
        s.value = 3;
        expect(s.peek()).toBe(3);
    });

    it("computed tagging helpers (.value/.peek/.get)", () => {
        const s: any = signal(2);
        const c: any = computed(() => s.value * 2);
        expect(isSignal(c)).toBe(true);
        expect(c.value).toBe(4);
        expect(c.peek()).toBe(4);
        expect(c.get()).toBe(4);
        s.value = 3;
        expect(c.value).toBe(6);
    });
});

describe("deepSignal.ts extra branches", () => {
    it("access well-known symbol property returns raw value and not a signal", () => {
        const tag = Symbol.toStringTag;
        const ds = deepSignal({ [tag]: "Custom", x: 1 }) as any;
        const val = ds[tag];
        expect(val).toBe("Custom");
    });

    it("access Set Symbol.iterator.toString() key path (skip branch)", () => {
        const ds = deepSignal({ set: new Set([1]) }) as any;
        const iterKey = Symbol.iterator.toString(); // 'Symbol(Symbol.iterator)'
        // Accessing this string property triggers skip branch (no special handling needed)
        const maybe = ds.set[iterKey];
        // underlying Set likely has undefined for that string key
        expect(maybe).toBeUndefined();
    });
});
