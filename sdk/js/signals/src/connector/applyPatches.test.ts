import { describe, test, expect } from "vitest";
import { applyPatches, Patch } from "../index.ts";

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
        applyPatches(state, diff);
        expect(state.tags).toBeInstanceOf(Set);
        expect([...state.tags]).toEqual(["a"]);
    });
    test("add multiple primitives into new set", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", valType: "set", path: p("nums"), value: [1, 2, 3] },
        ];
        applyPatches(state, diff);
        expect([...state.nums]).toEqual([1, 2, 3]);
    });
    test("add primitives merging into existing set", () => {
        const state: any = { nums: new Set([1]) };
        const diff: Patch[] = [
            { op: "add", valType: "set", path: p("nums"), value: [2, 3] },
        ];
        applyPatches(state, diff);
        expect([...state.nums].sort()).toEqual([1, 2, 3]);
    });
    test("remove single primitive from set", () => {
        const state: any = { tags: new Set(["a", "b"]) };
        const diff: Patch[] = [
            { op: "remove", valType: "set", path: p("tags"), value: "a" },
        ];
        applyPatches(state, diff);
        expect([...state.tags]).toEqual(["b"]);
    });
    test("remove multiple primitives from set", () => {
        const state: any = { nums: new Set([1, 2, 3, 4]) };
        const diff: Patch[] = [
            { op: "remove", valType: "set", path: p("nums"), value: [2, 4] },
        ];
        applyPatches(state, diff);
        expect([...state.nums].sort()).toEqual([1, 3]);
    });
});

describe("applyDiff - multi-valued objects (Set-based)", () => {
    test("create multi-object container (Set) without @id", () => {
        const state: any = { "urn:person1": {} };
        const diff: Patch[] = [
            {
                op: "add",
                valType: "object",
                path: p("urn:person1", "children"),
            },
        ];
        applyPatches(state, diff);
        expect(state["urn:person1"].children).toBeInstanceOf(Set);
    });

    test("add object to Set with @id", () => {
        const state: any = { "urn:person1": { children: new Set() } };
        const diff: Patch[] = [
            // First patch creates the object in the Set
            {
                op: "add",
                valType: "object",
                path: p("urn:person1", "children", "urn:child1"),
            },
            // Second patch adds the @graph property (optional, for context)
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child1", "@graph"),
                value: "urn:graph1",
            },
            // Third patch adds the @id property
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child1", "@id"),
                value: "urn:child1",
            },
        ];
        applyPatches(state, diff);
        const children = state["urn:person1"].children;
        expect(children).toBeInstanceOf(Set);
        expect(children.size).toBe(1);
        const child = [...children][0];
        expect(child["@id"]).toBe("urn:child1");
        expect(child["@graph"]).toBeDefined();
    });

    test("add object to root Set", () => {
        const state = new Set();
        const diff: Patch[] = [
            // First patch creates the object in the Set
            {
                op: "add",
                valType: "object",
                path: p("urn:graph1|urn:root1"),
            },
            // Second patch adds the @graph property (optional, for context)
            {
                op: "add",
                path: p("urn:graph1|urn:root1", "@graph"),
                value: "urn:graph1",
            },
            // Third patch adds the @id property
            {
                op: "add",
                path: p("urn:graph1|urn:root1", "@id"),
                value: "urn:root1",
            },
        ];
        applyPatches(state, diff);
        const children = [...state];
        expect(children.length).toBe(1);
        const child = children[0] as any;
        expect(child).toBeTypeOf("object");
        expect(child["@id"]).toBe("urn:root1");
        expect(child["@graph"]).toBe("urn:graph1");
    });

    test("add properties to object in Set", () => {
        const obj = { "@id": "urn:child1", "@graph": "urn:graph1" };
        const state: any = { "urn:person1": { children: new Set([obj]) } };
        const diff: Patch[] = [
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child1", "name"),
                value: "Alice",
            },
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child1", "age"),
                value: 10,
            },
        ];
        applyPatches(state, diff);
        const child = [...state["urn:person1"].children][0];
        expect(child.name).toBe("Alice");
        expect(child.age).toBe(10);
    });

    test("remove object from Set by @id", () => {
        const obj1 = {
            "@id": "urn:child1",
            "@graph": "urn:graph1",
            name: "Alice",
        };
        const obj2 = {
            "@id": "urn:child2",
            "@graph": "urn:graph2",
            name: "Bob",
        };
        const state: any = {
            "urn:person1": { children: new Set([obj1, obj2]) },
        };
        const diff: Patch[] = [
            { op: "remove", path: p("urn:person1", "children", "urn:child1") },
        ];
        applyPatches(state, diff);
        const children = state["urn:person1"].children;
        expect(children.size).toBe(1);
        const remaining = [...children][0];
        expect(remaining["@id"]).toBe("urn:child2");
    });

    test("remove object from root set", () => {
        const obj1 = {
            "@id": "urn:child1",
            "@graph": "urn:graph1",
            name: "Alice",
        };
        const obj2 = {
            "@id": "urn:child2",
            "@graph": "urn:graph2",
            name: "Bob",
        };
        const state = new Set([
            { "@id": "urn:person1", "@graph": "urn:graph3", children: [obj1] },
            { "@id": "urn:person2", "@graph": "urn:graph4", children: [obj2] },
        ]);
        const diff: Patch[] = [{ op: "remove", path: p("urn:person1") }];
        applyPatches(state, diff);
        expect(state.size).toBe(1);
    });

    test("create nested Set (multi-valued property within object in Set)", () => {
        const parent: any = { "@id": "urn:parent1", "@graph": "urn:graph0" };
        const state: any = { root: { parents: new Set([parent]) } };
        const diff: Patch[] = [
            {
                op: "add",
                valType: "object",
                path: p("root", "parents", "urn:parent1", "children"),
            },
            {
                op: "add",
                valType: "object",
                path: p(
                    "root",
                    "parents",
                    "urn:parent1",
                    "children",
                    "urn:child1"
                ),
            },
            {
                op: "add",
                path: p(
                    "root",
                    "parents",
                    "urn:parent1",
                    "children",
                    "urn:child1",
                    "@graph"
                ),
                value: "urn:graph1",
            },
            {
                op: "add",
                path: p(
                    "root",
                    "parents",
                    "urn:parent1",
                    "children",
                    "urn:child1",
                    "@id"
                ),
                value: "urn:child1",
            },
        ];
        applyPatches(state, diff);
        const nestedChildren = parent.children;
        expect(nestedChildren).toBeInstanceOf(Set);
        expect(nestedChildren.size).toBe(1);
    });
});

describe("applyDiff - object & literal operations", () => {
    test("create single object (with @id)", () => {
        const state: any = { "urn:person1": {} };
        const diff: Patch[] = [
            { op: "add", path: p("urn:person1", "address"), valType: "object" },
            {
                op: "add",
                path: p("urn:person1", "address", "@graph"),
                value: "urn:graph1",
            },
            {
                op: "add",
                path: p("urn:person1", "address", "@id"),
                value: "urn:addr1",
            },
        ];
        applyPatches(state, diff);
        expect(state["urn:person1"].address["@id"]).toBe("urn:addr1");
        expect(state["urn:person1"].address["@graph"]).toBeDefined();
        expect(state["urn:person1"].address).not.toBeInstanceOf(Set);
    });

    test("create multi-object container (without @id) -> Set", () => {
        const state: any = { "urn:person1": {} };
        const diff: Patch[] = [
            {
                op: "add",
                path: p("urn:person1", "addresses"),
                valType: "object",
            },
        ];
        applyPatches(state, diff);
        expect(state["urn:person1"].addresses).toBeInstanceOf(Set);
    });

    test("add object (create empty object with @id)", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", path: p("address"), valType: "object" },
            { op: "add", path: p("address", "@graph"), value: "urn:graph1" },
            { op: "add", path: p("address", "@id"), value: "urn:addr1" },
        ];
        applyPatches(state, diff);
        expect(state.address["@id"]).toBe("urn:addr1");
        expect(state.address["@graph"]).toBeDefined();
        expect(state.address).not.toBeInstanceOf(Set);
    });
    test("add nested object path with ensurePathExists and @id", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", path: p("a", "b", "c"), valType: "object" },
            {
                op: "add",
                path: p("a", "b", "c", "@graph"),
                value: "urn:graph1",
            },
            { op: "add", path: p("a", "b", "c", "@id"), value: "urn:c1" },
        ];
        applyPatches(state, diff, true);
        expect(state.a.b.c["@id"]).toBe("urn:c1");
        expect(state.a.b.c["@graph"]).toBeDefined();
        expect(state.a.b.c).not.toBeInstanceOf(Set);
    });
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
});

describe("applyDiff - multiple mixed patches in a single diff", () => {
    test("sequence of mixed set/object/literal add & remove", () => {
        const state: any = {
            "urn:person1": {},
            tags: new Set(["old"]),
        };
        const diff: Patch[] = [
            // Create multi-object Set
            {
                op: "add",
                valType: "object",
                path: p("urn:person1", "addresses"),
            },
            {
                op: "add",
                valType: "object",
                path: p("urn:person1", "addresses", "urn:addr1"),
            },
            {
                op: "add",
                path: p("urn:person1", "addresses", "urn:addr1", "@graph"),
                value: "urn:graph1",
            },
            {
                op: "add",
                path: p("urn:person1", "addresses", "urn:addr1", "@id"),
                value: "urn:addr1",
            },
            {
                op: "add",
                path: p("urn:person1", "addresses", "urn:addr1", "street"),
                value: "Main St",
            },
            // Create single object
            { op: "add", path: p("profile"), valType: "object" },
            { op: "add", path: p("profile", "@graph"), value: "urn:graph2" },
            { op: "add", path: p("profile", "@id"), value: "urn:profile1" },
            { op: "add", path: p("profile", "name"), value: "Alice" },
            // Primitive set operations
            { op: "add", valType: "set", path: p("tags"), value: ["new"] },
            { op: "remove", valType: "set", path: p("tags"), value: "old" },
        ];
        applyPatches(state, diff); // Enable ensurePathExists for nested object creation
        expect(state["urn:person1"].addresses).toBeInstanceOf(Set);
        expect(state["urn:person1"].addresses.size).toBe(1);
        const addr = [...state["urn:person1"].addresses][0];
        expect(addr["@id"]).toBe("urn:addr1");
        expect(addr["@graph"]).toBeDefined();
        expect(addr.street).toBe("Main St");
        expect(state.profile["@id"]).toBe("urn:profile1");
        expect(state.profile["@graph"]).toBeDefined();
        expect(state.profile.name).toBe("Alice");
        expect([...state.tags]).toEqual(["new"]);
    });

    test("complex nested path creation and mutations with ensurePathExists", () => {
        const state: any = {};
        const diff: Patch[] = [
            // Create b as a single object (with @id)
            { op: "add", path: p("a", "b"), valType: "object" },
            { op: "add", path: p("a", "b", "@graph"), value: "urn:graph1" },
            { op: "add", path: p("a", "b", "@id"), value: "urn:b1" },
            { op: "add", path: p("a", "b", "c"), value: 1 },
            // Create a primitive set
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
        applyPatches(state, diff, true);
        expect(state.a.b["@id"]).toBe("urn:b1");
        expect(state.a.b["@graph"]).toBeDefined();
        expect(state.a.b.c).toBeUndefined();
        expect(state.a.b.d).toBe(2);
        expect(state.a.nums).toBeInstanceOf(Set);
        expect([...state.a.nums].sort()).toEqual([1, 3]);
    });
});

describe("applyDiff - complete workflow example", () => {
    test("full example: create person with single address and multiple children", () => {
        const state: any = {};
        const diff: Patch[] = [
            // Create root person object
            { op: "add", path: p("urn:person1"), valType: "object" },
            {
                op: "add",
                path: p("urn:person1", "@graph"),
                value: "urn:graph1",
            },
            { op: "add", path: p("urn:person1", "@id"), value: "urn:person1" },
            { op: "add", path: p("urn:person1", "name"), value: "John" },

            // Add single address object
            { op: "add", path: p("urn:person1", "address"), valType: "object" },
            {
                op: "add",
                path: p("urn:person1", "address", "@graph"),
                value: "urn:graph2",
            },
            {
                op: "add",
                path: p("urn:person1", "address", "@id"),
                value: "urn:addr1",
            },
            {
                op: "add",
                path: p("urn:person1", "address", "street"),
                value: "1st Street",
            },
            {
                op: "add",
                path: p("urn:person1", "address", "country"),
                value: "Greece",
            },

            // Create multi-valued children Set
            {
                op: "add",
                path: p("urn:person1", "children"),
                valType: "object",
            },

            // Add first child
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child1"),
                valType: "object",
            },
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child1", "@graph"),
                value: "urn:graph3",
            },
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child1", "@id"),
                value: "urn:child1",
            },
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child1", "name"),
                value: "Alice",
            },

            // Add second child
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child2"),
                valType: "object",
            },
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child2", "@graph"),
                value: "urn:graph4",
            },
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child2", "@id"),
                value: "urn:child2",
            },
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child2", "name"),
                value: "Bob",
            },

            // Add primitive set (tags)
            {
                op: "add",
                valType: "set",
                path: p("urn:person1", "tags"),
                value: ["developer", "parent"],
            },
        ];

        applyPatches(state, diff); // Enable ensurePathExists to create nested objects

        // Verify person
        expect(state["urn:person1"]["@id"]).toBe("urn:person1");
        expect(state["urn:person1"]["@graph"]).toBeDefined();
        expect(state["urn:person1"].name).toBe("John");

        // Verify single address (plain object)
        expect(state["urn:person1"].address).not.toBeInstanceOf(Set);
        expect(state["urn:person1"].address["@id"]).toBe("urn:addr1");
        expect(state["urn:person1"].address["@graph"]).toBeDefined();
        expect(state["urn:person1"].address.street).toBe("1st Street");
        expect(state["urn:person1"].address.country).toBe("Greece");

        // Verify children Set
        const children = state["urn:person1"].children;
        expect(children).toBeInstanceOf(Set);
        expect(children.size).toBe(2);

        const childrenArray = [...children];
        const alice = childrenArray.find((c: any) => c["@id"] === "urn:child1");
        const bob = childrenArray.find((c: any) => c["@id"] === "urn:child2");
        expect(alice["@graph"]).toBeDefined();
        expect(alice.name).toBe("Alice");
        expect(bob["@graph"]).toBeDefined();
        expect(bob.name).toBe("Bob");

        // Verify primitive set
        expect(state["urn:person1"].tags).toBeInstanceOf(Set);
        expect([...state["urn:person1"].tags].sort()).toEqual([
            "developer",
            "parent",
        ]);
    });

    test("update and remove operations on complex structure", () => {
        // Start with pre-existing structure
        const child1 = {
            "@id": "urn:child1",
            "@graph": "urn:graph3",
            name: "Alice",
        };
        const child2 = {
            "@id": "urn:child2",
            "@graph": "urn:graph4",
            name: "Bob",
        };
        const state: any = {
            "urn:person1": {
                "@id": "urn:person1",
                "@graph": "urn:graph1",
                name: "John",
                address: {
                    "@id": "urn:addr1",
                    "@graph": "urn:graph2",
                    street: "1st Street",
                    country: "Greece",
                },
                children: new Set([child1, child2]),
                tags: new Set(["developer", "parent"]),
            },
        };

        const diff: Patch[] = [
            // Update address property
            {
                op: "add",
                path: p("urn:person1", "address", "street"),
                value: "2nd Street",
            },

            // Remove one child
            { op: "remove", path: p("urn:person1", "children", "urn:child1") },

            // Update child property
            {
                op: "add",
                path: p("urn:person1", "children", "urn:child2", "age"),
                value: 12,
            },

            // Remove tag
            {
                op: "remove",
                valType: "set",
                path: p("urn:person1", "tags"),
                value: "developer",
            },
        ];

        applyPatches(state, diff);

        expect(state["urn:person1"].address.street).toBe("2nd Street");
        expect(state["urn:person1"].children.size).toBe(1);
        expect([...state["urn:person1"].children][0]["@id"]).toBe("urn:child2");
        expect([...state["urn:person1"].children][0].age).toBe(12);
        expect([...state["urn:person1"].tags]).toEqual(["parent"]);
    });
});

describe("applyDiff - ignored / invalid scenarios", () => {
    test("skip patch with non-leading slash path", () => {
        const state: any = {};
        const diff: Patch[] = [
            { op: "add", path: "address/street", value: "x" },
        ];
        applyPatches(state, diff);
        expect(state).toEqual({});
    });
    test("missing parent without ensurePathExists -> patch skipped and no mutation", () => {
        const state: any = {};
        const diff: Patch[] = [{ op: "add", path: p("a", "b", "c"), value: 1 }];
        applyPatches(state, diff, false);
        expect(state).toEqual({});
    });
});
