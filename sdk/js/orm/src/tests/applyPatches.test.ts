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
import { deepSignal } from "@ng-org/alien-deepsignals";

let deepSignalWithIdGen = (val: any) =>
    deepSignal(val, {
        syntheticIdPropertyName: "@id",
    });

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

describe("applyDiff - set operations (primitives)", () => {
    test("add single primitive into existing set", () => {
        const state: any = { tags: new Set() };
        const diff: Patch[] = [
            { op: "add", valType: "set", path: p("tags"), value: "a" },
        ];
        applyPatches(state, diff);
        expect(state.tags).toBeInstanceOf(Set);
        expect([...state.tags]).toEqual(["a"]);
    });
    test("add multiple primitives into existing set", () => {
        const state: any = { nums: new Set() };
        const diff: Patch[] = [
            { op: "add", valType: "set", path: p("nums"), value: [1, 2, 3] },
        ];
        applyPatches(state, diff);
        expect(state.nums).toBeInstanceOf(Set);
        expect([...state.nums]).toEqual([1, 2, 3]);
    });

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
    test("add object to Set with @id", () => {
        const state = deepSignalWithIdGen(
            new Set([
                {
                    "@id": "urn:person1",
                    children: new Set(),
                },
            ])
        );
        const diff: Patch[] = [
            // First patch creates the object in the Set
            {
                op: "add",
                valType: "set",
                value: { "@id": "urn:child1", foo: "bar" },
                path: p("urn:person1", "children"),
            },
        ];

        applyPatches(state, diff);
        const children = state.getById("urn:person1").children;
        expect(children).toBeInstanceOf(Set);
        expect(children.size).toBe(1);
        const child = [...children][0];
        expect(child).toEqual({ "@id": "urn:child1", foo: "bar" });
    });

    test("add object to Set with synthetic id path", () => {
        const state = deepSignalWithIdGen(
            new Set([
                {
                    "@id": "urn:person1",
                    children: new Set(),
                },
            ])
        );
        const diff: Patch[] = [
            // First patch creates the object in the Set
            {
                op: "add",
                valType: "set",
                value: { "@id": "urn:child1", foo: "bar" },
                path: p("urn:person1", "children", "customSyntheticId"),
            },
        ];

        applyPatches(state, diff);
        const children = state.getById("urn:person1").children;
        expect(children).toBeInstanceOf(Set);
        expect(children.size).toBe(1);
        const child = children.getById("customSyntheticId");

        expect(child).toEqual({ "@id": "urn:child1", foo: "bar" });
    });

    test("add object to Set that doesn't exist yet", () => {
        const state = deepSignalWithIdGen({ foo: {} });
        const diff: Patch[] = [
            // First patch creates the object in the Set
            {
                op: "add",
                valType: "set",
                value: { "@id": "urn:child1", foo: "bar" },
                path: p("foo", "children"),
            },
        ];

        applyPatches(state, diff);
        expect(state.foo.children).toBeInstanceOf(Set);
        expect(state.foo.children.getById("urn:child1")).toEqual({
            "@id": "urn:child1",
            foo: "bar",
        });
    });

    test("add properties to object in Set", () => {
        const obj = { "@id": "urn:child1", "@graph": "urn:graph1" };
        const state: any = deepSignalWithIdGen({
            "urn:person1": { children: new Set([obj]) },
        });
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

    test("remove object from Set by synthetic id path", () => {
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
        const state: any = deepSignalWithIdGen({
            "urn:person1": { children: new Set([obj1, obj2]) },
        });
        const diff: Patch[] = [
            {
                op: "remove",
                valType: "set",
                path: p("urn:person1", "children", "urn:child1"),
            },
        ];
        applyPatches(state, diff);
        const children = state["urn:person1"].children;
        expect(children.size).toBe(1);
        const remaining = [...children][0];
        expect(remaining["@id"]).toBe("urn:child2");
    });
    test("remove object from Set by @id prop", () => {
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
        const state: any = deepSignalWithIdGen({
            "urn:person1": { children: new Set([obj1, obj2]) },
        });
        const diff: Patch[] = [
            {
                op: "remove",
                valType: "set",
                path: p("urn:person1", "children"),
                value: {
                    "@id": "urn:child1",
                },
            },
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
        const state = deepSignalWithIdGen(
            new Set([
                {
                    "@id": "urn:person1",
                    "@graph": "urn:graph3",
                    children: [obj1],
                },
                {
                    "@id": "urn:person2",
                    "@graph": "urn:graph4",
                    children: [obj2],
                },
            ])
        );
        const diff: Patch[] = [
            { op: "remove", valType: "set", path: p("urn:person1") },
        ];
        applyPatches(state, diff);
        expect(state.size).toBe(1);
    });
});

describe("applyDiff - complete workflow example", () => {
    test("full example: create person with single address and multiple children", () => {
        const state: any = deepSignalWithIdGen(new Set());
        const diff: Patch[] = [
            // Create root person object
            {
                op: "add",
                valType: "set",
                path: p(),
                value: {
                    "@id": "urn:person1",
                    "@graph": "urn:graph2",
                    name: "John",
                },
            },

            // Add single address object
            {
                op: "add",
                path: p("urn:person1", "address"),
                value: {
                    "@id": "urn:addr1",
                    "@graph": "urn:graph2",
                    street: "1st Street",
                    country: "Greece",
                },
            },

            // Add first child
            {
                op: "add",
                path: p("urn:person1", "children"),
                valType: "set",
                value: {
                    "@graph": "urn:graph3",
                    "@id": "urn:child1",
                    name: "Alice",
                },
            },
            // Add second child
            {
                op: "add",
                path: p("urn:person1", "children"),
                valType: "set",
                value: {
                    "@graph": "urn:graph4",
                    "@id": "urn:child2",
                    name: "Bob",
                },
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
        const person1 = state.getById("urn:person1");
        expect(person1["@id"]).toBe("urn:person1");
        expect(person1["@graph"]).toBe("urn:graph2");
        expect(person1.name).toBe("John");

        // Verify single address (plain object)
        expect(person1.address).not.toBeInstanceOf(Set);
        expect(person1.address["@id"]).toBe("urn:addr1");
        expect(person1.address["@graph"]).toBe("urn:graph2");
        expect(person1.address.street).toBe("1st Street");
        expect(person1.address.country).toBe("Greece");

        // Verify children Set
        const children = person1.children;
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
        expect(person1.tags).toBeInstanceOf(Set);
        expect([...person1.tags].sort()).toEqual(["developer", "parent"]);
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
        const state: any = deepSignalWithIdGen({
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
        });

        const diff: Patch[] = [
            // Update address property
            {
                op: "add",
                path: p("urn:person1", "address", "street"),
                value: "2nd Street",
            },

            // Remove one child
            {
                op: "remove",
                valType: "set",
                path: p("urn:person1", "children", "urn:child1"),
            },

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
        applyPatches(state, diff);
        expect(state).toEqual({});
    });
});
