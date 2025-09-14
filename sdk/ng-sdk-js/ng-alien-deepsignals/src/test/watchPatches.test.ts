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
    expect(allPaths.some((p) => p.startsWith("s."))).toBe(true);
    stop();
  });

  it("emits patches for nested objects added after initialization", async () => {
    const state = deepSignal<{ root: any }>({ root: {} });
    const patches: DeepPatch[][] = [];
    const { stopListening: stop } = watch(state, ({ patches: batch }) =>
      patches.push(batch)
    );
    state.root.child = { level: { value: 1 } };
    state.root.child.level.value = 2;
    await Promise.resolve();
    const flat = patches.flat().map((p) => p.path.join("."));
    expect(flat).toContain("root.child");
    expect(flat).toContain("root.child.level.value");
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
      const all = batches.flat().map((p) => p.path.join("."));
      expect(all).toEqual(["s"]);
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
      const paths = patches.flat().map((p) => p.path.join("."));
      expect(paths).toContain("s.5");
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
      const entry = addWithId(st.s as any, { id: "e1", inner: { v: 1 } }, "e1");
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
      expect(afterProxied.some((p) => p.endsWith("id1.data.x"))).toBe(true);
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
      const keys = patches
        .flat()
        .filter((p) => p.op === "add")
        .map((p) => p.path.slice(-1)[0]);
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
