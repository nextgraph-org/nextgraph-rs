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
import { deepSignal, getDeepSignalRootId } from "../../deepSignal";
import { watch } from "../../watch";

describe("watch advanced", () => {
    it("basic patch watcher fires on deep mutations", async () => {
        const st = deepSignal({ a: { b: { c: 1 } } });
        let batches: number = 0;
        watch(st, ({ patches }) => {
            if (patches.length) batches++;
        });
        st.a.b.c = 2;
        st.a.b = { c: 3 } as any;
        await Promise.resolve();
        expect(batches).toBeGreaterThan(0);
    });

    it("watch once option still stops after first batch", async () => {
        const st = deepSignal({ a: 1 });
        let count = 0;
        watch(
            st,
            () => {
                count++;
            },
            { once: true, immediate: true }
        );
        st.a = 2;
        st.a = 3;
        await Promise.resolve();
        expect(count).toBe(1);
    });
});

describe("patches & root ids", () => {
    it("root ids are unique", () => {
        const a = deepSignal({});
        const b = deepSignal({});
        expect(getDeepSignalRootId(a)).not.toBe(getDeepSignalRootId(b));
    });

    // legacy watchPatches API removed; patch mode only valid for deepSignal roots
    it("watch throws on non-deepSignal input", () => {
        expect(() => watch({} as any, () => {})).toThrow();
    });

    it("Map unsupported does not emit patches", async () => {
        const m = new Map<string, number>();
        const st = deepSignal({ m });
        const patches: any[] = [];
        const { stopListening: stop } = watch(st, ({ patches: batch }) =>
            patches.push(batch)
        );
        m.set("a", 1);
        await Promise.resolve();
        await Promise.resolve();
        expect(patches.length).toBe(0);
        stop();
    });
});

describe("tier3: Set iteration variants", () => {
    it("entries() iteration proxies nested mutation", async () => {
        const st = deepSignal(
            { s: new Set<any>() },
            {
                syntheticIdPropertyName: "id",
                propGenerator: ({ object }) => ({ syntheticId: object.id }),
            }
        );
        st.s.add({ id: "eEnt", inner: { v: 1 } });
        const paths: string[] = [];
        const { stopListening: stop } = watch(st, ({ patches }) =>
            paths.push(...patches.map((pp: any) => pp.path.join(".")))
        );
        for (const [val] of st.s.entries()) {
            (val as any).inner.v;
        } // ensure proxy
        for (const [val] of st.s.entries()) {
            (val as any).inner.v = 2;
        }
        await Promise.resolve();
        await Promise.resolve();
        expect(paths.some((p) => p.endsWith("eEnt.inner.v"))).toBe(true);
        stop();
    });

    it("forEach iteration proxies nested mutation", async () => {
        const st = deepSignal(
            { s: new Set<any>() },
            {
                syntheticIdPropertyName: "id",
                propGenerator: ({ object }) => ({ syntheticId: object.id }),
            }
        );
        st.s.add({ id: "fe1", data: { n: 1 } });
        const { stopListening: stop } = watch(st, () => {});
        st.s.forEach((e) => (e as any).data.n); // access
        st.s.forEach((e) => {
            (e as any).data.n = 2;
        });
        await Promise.resolve();
        await Promise.resolve();
        stop();
    });

    it("keys() iteration returns proxies", async () => {
        const st = deepSignal(
            { s: new Set<any>() },
            {
                syntheticIdPropertyName: "id",
                propGenerator: ({ object }) => ({ syntheticId: object.id }),
            }
        );
        st.s.add({ id: "k1", foo: { x: 1 } });
        const { stopListening: stop } = watch(st, () => {});
        for (const e of st.s.keys()) {
            (e as any).foo.x = 2;
        }
        await Promise.resolve();
        await Promise.resolve();
        stop();
    });

    it("iterator helpers exist on Set iterators and the root Set", () => {
        const st = deepSignal({ s: new Set([1, 2, 3]) });
        const viaIterator = st.s
            .values()
            .map((value) => (value as number) * 2)
            .filter((value) => value > 2)
            .toArray();
        expect(viaIterator).to.deep.equal([4, 6]);

        const viaRoot = st.s
            .map((value) => (value as number) + 1)
            .take(2)
            .toArray();
        expect(viaRoot).to.deep.equal([2, 3]);
    });

    it("set iterator helpers return proxied objects", async () => {
        const st = deepSignal(
            { s: new Set<any>() },
            {
                syntheticIdPropertyName: "id",
                propGenerator: ({ object }) => ({ syntheticId: object.id }),
            }
        );
        st.s.add({ id: "obj1", nested: { value: 1 } });
        const [entry] = st.s.map((value) => value).toArray();
        const paths: string[] = [];
        const { stopListening: stop } = watch(st, ({ patches }) =>
            paths.push(...patches.map((pp: any) => pp.path.join(".")))
        );
        (entry as any).nested.value = 5;
        await Promise.resolve();
        await Promise.resolve();
        expect(paths.some((p) => p.endsWith("obj1.nested.value"))).to.equal(
            true
        );
        stop();
    });

    it("iterator helper polyfill runs when Iterator.from is missing", () => {
        const iteratorCtor: any = (globalThis as any).Iterator;
        const hadFrom = !!iteratorCtor && "from" in iteratorCtor;
        const originalFrom = iteratorCtor?.from;

        if (iteratorCtor) {
            delete iteratorCtor.from;
        }

        try {
            const st = deepSignal({ s: new Set([1, 2, 3]) });
            const results = st.s
                .values()
                .map((value) => (value as number) * 3)
                .drop(1)
                .toArray();
            expect(results).to.deep.equal([6, 9]);
        } finally {
            if (iteratorCtor) {
                if (hadFrom) {
                    iteratorCtor.from = originalFrom;
                } else {
                    delete iteratorCtor.from;
                }
            }
        }
    });
});
