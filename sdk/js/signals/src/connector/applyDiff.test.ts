import { describe, test, expect } from "vitest";
import { applyDiff, Patch } from "../index.js";

/**
 * Build a patch path string from segments (auto-prefix /)
 */
function p(...segs: (string | number)[]) {
    return "/" + segs.map(String).join("/");
}

describe("applyDiff - set operations (primitives)", () => {
    test("add single primitive into new set", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", valType: "set", path: p("tags"), value: "a" },
        ];
        applyDiff(state, diff);
        expect(state.tags).toBeInstanceOf(Set);
        expect([...state.tags]).toEqual(["a"]);
    });
    test("add multiple primitives into new set", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", valType: "set", path: p("nums"), value: [1, 2, 3] },
        ];
        applyDiff(state, diff);
        expect([...state.nums]).toEqual([1, 2, 3]);
    });
    test("add primitives merging into existing set", () => {
        const state: any = { nums: new Set([1]) };
        const diff: Patch[] = [
            { op: "add", valType: "set", path: p("nums"), value: [2, 3] },
        ];
        applyDiff(state, diff);
        expect([...state.nums].sort()).toEqual([1, 2, 3]);
    });
    test("remove single primitive from set", () => {
        const state: any = { tags: new Set(["a", "b"]) };
        const diff: Patch[] = [
            { op: "remove", valType: "set", path: p("tags"), value: "a" },
        ];
        applyDiff(state, diff);
        expect([...state.tags]).toEqual(["b"]);
    });
    test("remove multiple primitives from set", () => {
        const state: any = { nums: new Set([1, 2, 3, 4]) };
        const diff: Patch[] = [
            { op: "remove", valType: "set", path: p("nums"), value: [2, 4] },
        ];
        applyDiff(state, diff);
        expect([...state.nums].sort()).toEqual([1, 3]);
    });
});

describe("applyDiff - set operations (object sets)", () => {
    test("add object entries to new object-set", () => {
        const state: any = {};
        const diff: Patch[] = [
            {
                op: "add",
                valType: "set",
                path: p("users"),
                value: { u1: { id: "u1", n: 1 }, u2: { id: "u2", n: 2 } },
            },
        ];
        applyDiff(state, diff);
        expect(state.users.u1).toEqual({ id: "u1", n: 1 });
        expect(state.users.u2).toEqual({ id: "u2", n: 2 });
    });
    test("merge object entries into existing object-set", () => {
        const state: any = { users: { u1: { id: "u1", n: 1 } } };
        const diff: Patch[] = [
            {
                op: "add",
                valType: "set",
                path: p("users"),
                value: { u2: { id: "u2", n: 2 } },
            },
        ];
        applyDiff(state, diff);
        expect(Object.keys(state.users).sort()).toEqual(["u1", "u2"]);
    });
    test("remove object entries from object-set", () => {
        const state: any = { users: { u1: {}, u2: {}, u3: {} } };
        const diff: Patch[] = [
            {
                op: "remove",
                valType: "set",
                path: p("users"),
                value: ["u1", "u3"],
            },
        ];
        applyDiff(state, diff);
        expect(Object.keys(state.users)).toEqual(["u2"]);
    });
    test("adding primitives to existing object-set replaces with Set", () => {
        const state: any = { mixed: { a: {}, b: {} } };
        const diff: Patch[] = [
            { op: "add", valType: "set", path: p("mixed"), value: [1, 2] },
        ];
        applyDiff(state, diff);
        expect(state.mixed).toBeInstanceOf(Set);
        expect([...state.mixed]).toEqual([1, 2]);
    });
});

describe("applyDiff - object & literal operations", () => {
    test("add object (create empty object)", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", path: p("address"), valType: "object" },
        ];
        applyDiff(state, diff);
        expect(state.address).toEqual({});
    });
    test("add nested object path with ensurePathExists", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", path: p("a", "b", "c"), valType: "object" },
        ];
        applyDiff(state, diff, true);
        expect(state.a.b.c).toEqual({});
    });
    test("add primitive value", () => {
        const state: any = { address: {} };
        const diff: Patch[] = [
            { op: "add", path: p("address", "street"), value: "1st" },
        ];
        applyDiff(state, diff);
        expect(state.address.street).toBe("1st");
    });
    test("overwrite primitive value", () => {
        const state: any = { address: { street: "old" } };
        const diff: Patch[] = [
            { op: "add", path: p("address", "street"), value: "new" },
        ];
        applyDiff(state, diff);
        expect(state.address.street).toBe("new");
    });
    test("remove primitive", () => {
        const state: any = { address: { street: "1st", country: "Greece" } };
        const diff: Patch[] = [{ op: "remove", path: p("address", "street") }];
        applyDiff(state, diff);
        expect(state.address.street).toBeUndefined();
        expect(state.address.country).toBe("Greece");
    });
    test("remove object branch", () => {
        const state: any = { address: { street: "1st" }, other: 1 };
        const diff: Patch[] = [{ op: "remove", path: p("address") }];
        applyDiff(state, diff);
        expect(state.address).toBeUndefined();
        expect(state.other).toBe(1);
    });
});

describe("applyDiff - multiple mixed patches in a single diff", () => {
    test("sequence of mixed set/object/literal add & remove", () => {
        const state: any = {
            users: { u1: { id: "u1" } },
            tags: new Set(["old"]),
        };
        const diff: Patch[] = [
            {
                op: "add",
                valType: "set",
                path: p("users"),
                value: { u2: { id: "u2" } },
            },
            { op: "add", path: p("profile"), valType: "object" },
            { op: "add", path: p("profile", "name"), value: "Alice" },
            { op: "add", valType: "set", path: p("tags"), value: ["new"] },
            { op: "remove", valType: "set", path: p("tags"), value: "old" },
        ];
        applyDiff(state, diff);
        expect(Object.keys(state.users).sort()).toEqual(["u1", "u2"]);
        expect(state.profile.name).toBe("Alice");
        expect([...state.tags]).toEqual(["new"]);
    });

    test("complex nested path creation and mutations with ensurePathExists", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", path: p("a", "b"), valType: "object" },
            { op: "add", path: p("a", "b", "c"), value: 1 },
            {
                op: "add",
                valType: "set",
                path: p("a", "nums"),
                value: [1, 2, 3],
            },
            { op: "remove", valType: "set", path: p("a", "nums"), value: 2 },
            { op: "add", path: p("a", "b", "d"), value: 2 },
            { op: "remove", path: p("a", "b", "c") },
        ];
        applyDiff(state, diff, true);
        expect(state.a.b.c).toBeUndefined();
        expect(state.a.b.d).toBe(2);
        expect(state.a.nums).toBeInstanceOf(Set);
        expect([...state.a.nums].sort()).toEqual([1, 3]);
    });
});

describe("applyDiff - ignored / invalid scenarios", () => {
    test("skip patch with non-leading slash path", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", path: "address/street", value: "x" },
        ];
        applyDiff(state, diff);
        expect(state).toEqual({});
    });
    test("missing parent without ensurePathExists -> patch skipped and no mutation", () => {
        const state: any = {};
        const diff: Patch[] = [{ op: "add", path: p("a", "b", "c"), value: 1 }];
        applyDiff(state, diff, false);
        expect(state).toEqual({});
    });
});

describe("applyDiff - ignored / invalid scenarios", () => {
    test("skip patch with non-leading slash path", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", path: "address/street", value: "x" },
        ];
        applyDiff(state, diff);
        expect(state).toEqual({});
    });
    test("missing parent without ensurePathExists -> patch skipped and no mutation", () => {
        const state: any = {};
        const diff: Patch[] = [{ op: "add", path: p("a", "b", "c"), value: 1 }];
        applyDiff(state, diff, false);
        expect(state).toEqual({});
    });
});
