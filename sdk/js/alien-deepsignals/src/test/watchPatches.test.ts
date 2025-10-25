import { describe, it, expect } from "vitest";
import {
    deepSignal,
    setSetEntrySyntheticId,
    addWithId,
    DeepPatch,
} from "../deepSignal";
import { watch, observe } from "../watch";

describe("watch (patch mode)", () => {
    it("emits set patches with correct paths and batching", async () => {
        const state = deepSignal({ a: { b: 1 }, arr: [1, { x: 2 }] });
        const received: DeepPatch[][] = [];
        const { stopListening: stop } = watch(state, ({ patches }) => {
            received.push(patches);
        });
        state.a.b = 2;
        (state.arr[1] as any).x = 3;
        state.arr.push(5);
        await Promise.resolve();
        expect(received.length).toBe(1);
        const batch = received[0];
        const paths = batch.map((p) => p.path.join(".")).sort();
        expect(paths).toContain("a.b");
        expect(paths).toContain("arr.1.x");
        expect(paths).toContain("arr.2");
        const addOps = batch.filter((p) => p.op === "add").length;
        expect(addOps).toBe(batch.length);
        stop();
    });

    it("emits delete patches without value", async () => {
        const state = deepSignal<{ a: { b?: number }; c?: number }>({
            a: { b: 1 },
            c: 2,
        });
        const out: DeepPatch[][] = [];
        const { stopListening: stop } = watch(state, ({ patches }) =>
            out.push(patches)
        );
        delete state.a.b;
        delete state.c;
        await Promise.resolve();
        expect(out.length).toBe(1);
        const [batch] = out;
        const deletePatches = batch.filter((p) => p.op === "remove");
        const delPaths = deletePatches.map((p) => p.path.join(".")).sort();
        expect(delPaths).toEqual(["a.b", "c"]);
        deletePatches.forEach((p: any) => expect(p.value).toBeUndefined());
        stop();
    });

    it("observe patch mode mirrors watch patch mode", async () => {
        const state = deepSignal({ a: 1 });
        const wp: DeepPatch[][] = [];
        const ob: DeepPatch[][] = [];
        const { stopListening: stop1 } = watch(state, ({ patches }) =>
            wp.push(patches)
        );
        const { stopListening: stop2 } = observe(state, ({ patches }) =>
            ob.push(patches)
        );
        state.a = 2;
        await Promise.resolve();
        expect(wp.length).toBe(1);
        expect(ob.length).toBe(1);
        expect(wp[0][0].path.join(".")).toBe("a");
        stop1();
        stop2();
    });

    it("filters out patches from other roots", async () => {
        const a = deepSignal({ x: 1 });
        const b = deepSignal({ y: 2 });
        const out: DeepPatch[][] = [];
        const { stopListening: stop } = watch(a, ({ patches }) =>
            out.push(patches)
        );
        b.y = 3;
        a.x = 2;
        await Promise.resolve();
        expect(out.length).toBe(1);
        expect(out[0][0].path.join(".")).toBe("x");
        stop();
    });

    it("emits patches for Set structural mutations (add/delete)", async () => {
        const state = deepSignal<{ s: Set<number> }>({ s: new Set([1, 2]) });
        const batches: DeepPatch[][] = [];
        const { stopListening: stop } = watch(state, ({ patches }) =>
            batches.push(patches)
        );
        state.s.add(3);
        state.s.delete(1);
        await Promise.resolve();
        expect(batches.length >= 1).toBe(true);
        const allPaths = batches.flatMap((b) => b.map((p) => p.path.join(".")));
        // For primitives, the path should be just "s" (the Set itself)
        expect(allPaths.every((p) => p === "s")).toBe(true);
        // Check the values
        const patches = batches.flat();
        const addPatches = patches.filter((p) => p.op === "add");
        const deletePatches = patches.filter((p) => p.op === "remove");
        expect(addPatches.length).toBe(1);
        expect(deletePatches.length).toBe(1);
        expect((addPatches[0] as any).value[0]).toBe(3);
        expect((deletePatches[0] as any).value).toBe(1);
        stop();
    });

    it("emits patches for nested objects added after initialization", async () => {
        const state = deepSignal<{ root: any }>({ root: {} });
        const patches: DeepPatch[][] = [];
        const { stopListening: stop } = watch(state, ({ patches: batch }) =>
            patches.push(batch)
        );
        state.root.child = { level: { value: 1 }, l1: "val" };
        await Promise.resolve();
        const flat = patches.flat().map((p) => p.path.join("."));
        expect(flat).toContain("root.child");
        expect(flat).toContain("root.child.level.value");
        stop();
    });

    it("emits patches for deeply nested arrays and objects", async () => {
        const state = deepSignal<{ data: any }>({ data: null });
        const patches: DeepPatch[][] = [];
        const { stopListening: stop } = watch(state, ({ patches: batch }) =>
            patches.push(batch)
        );
        state.data = {
            users: [
                {
                    id: 1,
                    profile: { name: "Alice", settings: { theme: "dark" } },
                },
                {
                    id: 2,
                    profile: { name: "Bob", settings: { theme: "light" } },
                },
            ],
            meta: { count: 2, active: true },
        };
        await Promise.resolve();

        const flat = patches.flat().map((p) => p.path.join("."));
        // Check for root object
        expect(flat).toContain("data");
        // Check for nested array
        expect(flat).toContain("data.users");
        // Check for array elements
        expect(flat).toContain("data.users.0");
        expect(flat).toContain("data.users.1");
        // Check for deeply nested properties
        expect(flat).toContain("data.users.0.profile.settings.theme");
        expect(flat).toContain("data.users.1.profile.settings.theme");
        expect(flat).toContain("data.meta.count");
        expect(flat).toContain("data.meta.active");
        stop();
    });

    it("emits patches for Set with nested objects added as one operation", async () => {
        const state = deepSignal<{ container: any }>({ container: {} });
        const patches: DeepPatch[][] = [];
        const { stopListening: stop } = watch(state, ({ patches: batch }) =>
            patches.push(batch)
        );
        state.container.items = new Set([
            { id: "a", data: { nested: { value: 1 } } },
            { id: "b", data: { nested: { value: 2 } } },
        ]);
        await Promise.resolve();

        const flat = patches.flat().map((p) => p.path.join("."));

        // Check for the Set itself
        expect(flat).toContain("container.items");
        // Check for Set entries (using their id as synthetic key)
        expect(flat.some((p) => p.startsWith("container.items.a"))).toBe(true);
        expect(flat.some((p) => p.startsWith("container.items.b"))).toBe(true);
        // Check for deeply nested properties within Set entries
        expect(flat).toContain("container.items.a.data.nested.value");
        expect(flat).toContain("container.items.b.data.nested.value");
        stop();
    });

    it("emits structural patches for sets of sets", async () => {
        const innerA = new Set<any>([{ id: "node1", x: 1 }]);
        const s = new Set<any>([innerA]);
        const state = deepSignal<{ graph: Set<any> }>({ graph: s });
        const batches: DeepPatch[][] = [];
        const { stopListening: stop } = watch(state, ({ patches }) =>
            batches.push(patches)
        );
        const innerB = new Set<any>([{ id: "node2", x: 5 }]);
        state.graph.add(innerB);
        ([...innerA][0] as any).x = 2;
        await Promise.resolve();
        const pathStrings = batches.flat().map((p) => p.path.join("."));
        expect(pathStrings.some((p) => p.startsWith("graph."))).toBe(true);
        stop();
    });

    it("tracks deep nested object mutation inside a Set entry after iteration", async () => {
        const rawEntry = { id: "n1", data: { val: 1 } };
        const st = deepSignal({ bag: new Set<any>([rawEntry]) });
        const collected: DeepPatch[][] = [];
        const { stopListening: stop } = watch(st, ({ patches }) =>
            collected.push(patches)
        );
        let proxied: any;
        for (const e of st.bag.values()) {
            proxied = e;
            e.data.val;
        }
        proxied.data.val = 2;
        await Promise.resolve();
        const flat = collected.flat().map((p: DeepPatch) => p.path.join("."));
        expect(flat.some((p: string) => p.endsWith("n1.data.val"))).toBe(true);
        stop();
    });

    it("allows custom synthetic id for Set entry", async () => {
        const node = { name: "x" };
        const state = deepSignal({ s: new Set<any>() });
        const collected2: DeepPatch[][] = [];
        const { stopListening: stop } = watch(state, ({ patches }) =>
            collected2.push(patches)
        );
        addWithId(state.s as any, node, "custom123");
        await Promise.resolve();
        const flat = collected2.flat().map((p: DeepPatch) => p.path.join("."));
        expect(flat.some((p: string) => p === "s.custom123")).toBe(true);
        stop();
    });

    describe("Set", () => {
        it("emits patches for primitive adds", async () => {
            const st = deepSignal({ s: new Set<any>() });
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            st.s.add(true);
            st.s.add(2);
            st.s.add("3");
            await Promise.resolve();

            expect(batches.length).toBe(1);
            const patches = batches[0];
            expect(patches.length).toBe(3);

            // All patches should have the same path (the Set itself)
            patches.forEach((p) => {
                expect(p.path.join(".")).toBe("s");
                expect(p.op).toBe("add");
                expect((p as any).type).toBe("set");
            });

            // Check that values are in the value field, not in path
            const values = patches.map((p: any) => p.value[0]);
            expect(values).toContain(true);
            expect(values).toContain(2);
            expect(values).toContain("3");
            stop();
        });
        it("emits patches for primitive deletes", async () => {
            const st = deepSignal({ s: new Set<any>([true, 2, "3"]) });
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            st.s.delete(true);
            st.s.delete(2);
            await Promise.resolve();

            expect(batches.length).toBe(1);
            const patches = batches[0];
            expect(patches.length).toBe(2);

            // All patches should have the same path (the Set itself)
            patches.forEach((p) => {
                expect(p.path.join(".")).toBe("s");
                expect(p.op).toBe("remove");
                expect((p as any).type).toBe("set");
            });

            // Check that values are in the value field
            const values = patches.map((p: any) => p.value);
            expect(values).toContain(true);
            expect(values).toContain(2);
            stop();
        });
        it("does not emit patches for non-existent primitives", async () => {
            const st = deepSignal({ s: new Set<any>([1, 2]) });
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            st.s.delete("nonexistent");
            st.s.delete(999);
            await Promise.resolve();

            expect(batches.length).toBe(0);
            stop();
        });
        it("does not emit patches for already added primitive", async () => {
            const st = deepSignal({ s: new Set<any>([1, "test", true]) });
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            st.s.add(1);
            st.s.add("test");
            st.s.add(true);
            await Promise.resolve();

            expect(batches.length).toBe(0);
            stop();
        });
        it("emits single structural patch on Set.clear()", async () => {
            const st = deepSignal({ s: new Set<any>() });
            addWithId(st.s as any, { id: "a", x: 1 }, "a");
            addWithId(st.s as any, { id: "b", x: 2 }, "b");
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            st.s.clear();
            await Promise.resolve();
            // clear() emits a single structural patch for the Set itself (op: "add", value: [])
            const structuralPatches = batches
                .flat()
                .filter((p) => p.path.length === 1 && p.path[0] === "s");
            expect(structuralPatches.length).toBe(1);
            expect(structuralPatches[0].op).toBe("add");
            expect((structuralPatches[0] as any).value).toEqual([]);
            stop();
        });
        it("emits delete patch for object entry", async () => {
            const st = deepSignal({ s: new Set<any>() });
            const obj = { id: "n1", x: 1 };
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches: batch }) =>
                patches.push(batch)
            );
            st.s.add(obj);
            st.s.delete(obj);
            await Promise.resolve();
            const all = patches
                .flat()
                .filter((p) => p.op === "remove")
                .map((p) => p.path.join("."));
            expect(all).toContain("s.n1");
            stop();
        });
        it("does not emit patch for duplicate add", async () => {
            const st = deepSignal({ s: new Set<number>([1]) });
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches: batch }) =>
                patches.push(batch)
            );
            st.s.add(1);
            await Promise.resolve();
            expect(patches.length).toBe(0);
            stop();
        });
        it("does not emit patch deleting non-existent entry", async () => {
            const st = deepSignal({ s: new Set<number>([1]) });
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches: batch }) =>
                patches.push(batch)
            );
            st.s.delete(2);
            await Promise.resolve();
            expect(patches.length).toBe(0);
            stop();
        });
        it("addWithId primitive returns primitive and emits patch with primitive key", async () => {
            const st = deepSignal({ s: new Set<any>() });
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches: batch }) =>
                patches.push(batch)
            );
            const ret = addWithId(st.s as any, 5, "ignored");
            expect(ret).toBe(5);
            await Promise.resolve();
            // For primitives, path should be just "s" and value should be in the value field
            const paths = patches.flat().map((p) => p.path.join("."));
            expect(paths).toContain("s");
            const values = patches.flat().map((p: any) => p.value?.[0]);
            expect(values).toContain(5);
            stop();
        });
        it("setSetEntrySyntheticId applies custom id without helper", async () => {
            const st = deepSignal({ s: new Set<any>() });
            const obj = { name: "x" };
            setSetEntrySyntheticId(obj, "customX");
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches: batch }) =>
                patches.push(batch)
            );
            st.s.add(obj);
            await Promise.resolve();
            const paths = patches.flat().map((p) => p.path.join("."));
            expect(paths).toContain("s.customX");
            stop();
        });
        it("values/entries/forEach proxy nested mutation", async () => {
            const st = deepSignal({ s: new Set<any>() });
            const entry = addWithId(
                st.s as any,
                { id: "e1", inner: { v: 1 } },
                "e1"
            );
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            for (const e of st.s.values()) {
                e.inner.v;
            }
            entry.inner.v = 2;
            await Promise.resolve();
            const vPaths = batches.flat().map((p) => p.path.join("."));
            expect(vPaths.some((p) => p.endsWith("e1.inner.v"))).toBe(true);
            stop();
        });
        it("raw reference mutation produces no deep patch while proxied does", async () => {
            const raw = { id: "id1", data: { x: 1 } };
            const st = deepSignal({ s: new Set<any>([raw]) });
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            raw.data.x = 2;
            await Promise.resolve();
            const afterRaw = batches.flat().map((p) => p.path.join("."));
            expect(afterRaw.some((p) => p.endsWith("id1.data.x"))).toBe(false);
            let proxied: any;
            for (const e of st.s.values()) proxied = e;
            proxied.data.x = 3;
            await Promise.resolve();
            const afterProxied = batches.flat().map((p) => p.path.join("."));
            expect(afterProxied.some((p) => p.endsWith("id1.data.x"))).toBe(
                true
            );
            stop();
        });
        it("synthetic id collision assigns unique blank node id", async () => {
            const st = deepSignal({ s: new Set<any>() });
            const a1 = { id: "dup", v: 1 };
            const a2 = { id: "dup", v: 2 };
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches: batch }) =>
                patches.push(batch)
            );
            st.s.add(a1);
            st.s.add(a2);
            await Promise.resolve();
            // Filter for Set structural patches only (path length 2: ['s', syntheticId])
            const setAddPatches = patches
                .flat()
                .filter(
                    (p) =>
                        p.op === "add" &&
                        p.path.length === 2 &&
                        p.path[0] === "s"
                );
            const keys = setAddPatches.map((p) => p.path.slice(-1)[0]);
            // Both objects should have unique synthetic IDs despite id collision
            expect(new Set(keys).size).toBe(2);
            stop();
        });

        it("allows Array.from() and spread on Set without brand errors and tracks nested mutation", async () => {
            const st = deepSignal({
                s: new Set<any>([{ id: "eIter", inner: { v: 1 } }]),
            });
            // Regression: previously 'values method called on incompatible Proxy' was thrown here.
            const arr = Array.from(st.s);
            expect(arr.length).toBe(1);
            expect(arr[0].inner.v).toBe(1);
            const spread = [...st.s];
            expect(spread[0].inner.v).toBe(1);
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            spread[0].inner.v = 2; // mutate nested field of iterated (proxied) entry
            await Promise.resolve();
            const flat = batches.flat().map((p) => p.path.join("."));
            expect(flat.some((p) => p.endsWith("eIter.inner.v"))).toBe(true);
            stop();
        });

        it("generates correct patches when root is a Set (primitive entries)", async () => {
            const rootSet = deepSignal(new Set<any>());
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(rootSet, ({ patches }) =>
                batches.push(patches)
            );
            rootSet.add(1);
            rootSet.add("test");
            rootSet.add(true);
            await Promise.resolve();

            expect(batches.length).toBe(1);
            const patches = batches[0];
            expect(patches.length).toBe(3);

            // When root is a Set, path should be empty array for primitive adds
            patches.forEach((p) => {
                expect(p.path).toEqual([]);
                expect(p.op).toBe("add");
                expect((p as any).type).toBe("set");
            });

            const values = patches.map((p: any) => p.value[0]);
            expect(values).toContain(1);
            expect(values).toContain("test");
            expect(values).toContain(true);
            stop();
        });

        it("generates correct patches when root is a Set (object entries)", async () => {
            const rootSet = deepSignal(new Set<any>());
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(rootSet, ({ patches }) =>
                batches.push(patches)
            );

            const obj1 = { "@id": "obj1", value: 1 };
            const obj2 = { "@id": "obj2", value: 2 };
            rootSet.add(obj1);
            rootSet.add(obj2);
            await Promise.resolve();

            const flat = batches.flat().map((p) => p.path.join("."));

            // When root is a Set, first element of path should be synthetic id
            expect(flat).toContain("obj1");
            expect(flat).toContain("obj1.@id");
            expect(flat).toContain("obj1.value");
            expect(flat).toContain("obj2");
            expect(flat).toContain("obj2.@id");
            expect(flat).toContain("obj2.value");
            stop();
        });

        it("tracks nested mutations when root is a Set", async () => {
            const rootSet = deepSignal(new Set<any>());
            const obj = { id: "nested", data: { x: 1 } };
            rootSet.add(obj);

            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(rootSet, ({ patches }) =>
                batches.push(patches)
            );

            // Get the proxied entry
            let proxied: any;
            for (const e of rootSet.values()) {
                proxied = e;
            }

            proxied.data.x = 2;
            await Promise.resolve();

            const flat = batches.flat().map((p) => p.path.join("."));
            expect(flat.some((p) => p === "nested.data.x")).toBe(true);
            stop();
        });
    });

    describe("Arrays & mixed batch", () => {
        it("emits patches for splice/unshift/shift in single batch", async () => {
            const st = deepSignal({ arr: [1, 2, 3] });
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            st.arr.splice(1, 1, 99, 100);
            st.arr.unshift(0);
            st.arr.shift();
            await Promise.resolve();
            const paths = batches.flat().map((p) => p.path.join("."));
            expect(paths.some((p) => p.startsWith("arr."))).toBe(true);
            stop();
        });
        it("mixed object/array/Set mutations batch together", async () => {
            const st = deepSignal({ o: { a: 1 }, arr: [1], s: new Set<any>() });
            const batches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(st, ({ patches }) =>
                batches.push(patches)
            );
            st.o.a = 2;
            st.arr.push(2);
            addWithId(st.s as any, { id: "z", v: 1 }, "z");
            await Promise.resolve();
            expect(batches.length).toBe(1);
            const paths = batches[0].map((p) => p.path.join("."));
            expect(paths).toContain("o.a");
            expect(paths).toContain("arr.1");
            expect(paths.some((p) => p.startsWith("s."))).toBe(true);
            stop();
        });
    });
});
