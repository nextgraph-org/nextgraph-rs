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
import { deepSignal } from "../../deepSignal.ts";

import { watch } from "../../watch.ts";
import { DeepPatch, DeepSignalOptions } from "../../types.ts";

describe("deepSignal options", () => {
    describe("attaching in onObjectAttached callback", () => {
        it("attach property to all nested objects", async () => {
            let counter = 100;
            const options: DeepSignalOptions = {
                onObjectAttached: ({ rawObject }) => {
                    if (Array.isArray(rawObject) || rawObject instanceof Set)
                        return;

                    rawObject["attachedProp"] = `auto-${counter++}`;
                    return {};
                },
            };

            const state = deepSignal({ root: {} as any }, options);
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(state, ({ patches: batch }) =>
                patches.push(batch)
            );

            state.root.level1 = {
                level2: {
                    level3: { value: "deep" },
                },
            };

            await Promise.resolve();

            // Check all levels have attachedProp
            expect((state.root.level1 as any)["attachedProp"]).toBeDefined();
            expect(
                (state.root.level1.level2 as any)["attachedProp"]
            ).toBeDefined();
            expect(
                (state.root.level1.level2.level3 as any)["attachedProp"]
            ).toBeDefined();

            // Check patches were emitted for all attachedProp fields
            const flat = patches.flat().map((p) => p.path.join("."));
            expect(flat).toContain("root.level1.attachedProp");
            expect(flat).toContain("root.level1.level2.attachedProp");
            expect(flat).toContain("root.level1.level2.level3.attachedProp");

            stop();
        });

        it("does not attach @id when option is undefined", () => {
            const state = deepSignal({ data: { nested: {} } });

            // Should not have @id
            expect("@id" in (state.data as any)).toBe(false);
            expect("@id" in (state.data.nested as any)).toBe(false);
        });

        it("attaches to objects in arrays", async () => {
            let counter = 200;
            const options: DeepSignalOptions = {
                onObjectAttached: ({ rawObject }) => {
                    if (Array.isArray(rawObject) || rawObject instanceof Set)
                        return;

                    rawObject["attachedProp"] = `arr-${counter++}`;
                    return {};
                },
            };

            const state = deepSignal({ items: [] as any[] }, options);
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(state, ({ patches: batch }) =>
                patches.push(batch)
            );

            state.items.push({ name: "Item 1" }, { name: "Item 2" });

            await Promise.resolve();

            // Both items should have attachedProp
            expect((state.items[0] as any)["attachedProp"]).toBeDefined();
            expect((state.items[1] as any)["attachedProp"]).toBeDefined();

            // Check patches
            const flat = patches.flat().map((p) => p.path.join("."));
            expect(flat).toContain("items.0.attachedProp");
            expect(flat).toContain("items.1.attachedProp");

            stop();
        });

        it("adds @id to objects in Sets", async () => {
            const options: DeepSignalOptions = {
                onObjectAttached: ({ rawObject }) => {
                    if (Array.isArray(rawObject) || rawObject instanceof Set)
                        return;

                    rawObject["@id"] =
                        `gen-${Math.random().toString(36).substr(2, 9)}`;
                    return {};
                },
                syntheticIdPropertyName: "@id",
            };

            const state = deepSignal({ s: new Set<any>() }, options);
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(state, ({ patches: batch }) =>
                patches.push(batch)
            );

            const obj1 = { value: 1 };
            const obj2 = { value: 2 };
            state.s.add(obj1);
            state.s.add(obj2);

            await Promise.resolve();

            // Get proxied objects from Set
            const proxiedObjs = Array.from(state.s);
            expect((proxiedObjs[0] as any)["@id"]).toBeDefined();
            expect((proxiedObjs[1] as any)["@id"]).toBeDefined();

            // @id should be used as synthetic key in paths
            const flat = patches.flat().map((p) => p.path.join("."));
            const obj1Id = (proxiedObjs[0] as any)["@id"];
            const obj2Id = (proxiedObjs[1] as any)["@id"];
            expect(flat.some((p) => p.startsWith(`s.${obj1Id}`))).toBe(true);
            expect(flat.some((p) => p.startsWith(`s.${obj2Id}`))).toBe(true);

            stop();
        });
    });

    describe("@id property behavior", () => {
        it("makes @id readonly", () => {
            const options: DeepSignalOptions = {
                syntheticIdPropertyName: "@id",
                readOnlyProps: ["@id"],
            };

            const state = deepSignal({ obj: {} as any }, options);
            state.obj.data = { value: 1 };

            // Attempting to modify @id should throw
            expect(() => {
                (state.obj.data as any)["@id"] = "new-id";
            }).toThrow("Cannot modify readonly property '@id'");
        });

        it("makes @id enumerable", () => {
            let counter = 300;
            const options: DeepSignalOptions = {
                onObjectAttached: ({ rawObject }) => {
                    if (Array.isArray(rawObject) || rawObject instanceof Set)
                        return;

                    rawObject["@id"] = `enum-${counter++}`;
                    return {};
                },
                syntheticIdPropertyName: "@id",
            };

            const state = deepSignal({ obj: {} as any }, options);
            state.obj.data = { value: 1 };

            // @id should show up in Object.keys()
            const keys = Object.keys(state.obj.data);
            expect(keys).toContain("@id");
        });

        it("emits patches for @id even on objects with existing @id", async () => {
            const options: DeepSignalOptions = {
                syntheticIdPropertyName: "@id",
            };

            const state = deepSignal({ container: {} as any }, options);
            const patches: DeepPatch[][] = [];
            const { stopListening: stop } = watch(state, ({ patches: batch }) =>
                patches.push(batch)
            );

            // Object already has @id before being added
            const objWithId = { "@id": "pre-existing", data: "test" };
            state.container.item = objWithId;

            await Promise.resolve();

            const flat = patches.flat().map((p) => p.path.join("."));
            // Patch should still be emitted for @id
            expect(flat).toContain("container.item.@id");

            // Verify the value in the patch
            const idPatch = patches
                .flat()
                .find((p) => p.path.join(".") === "container.item.@id");
            expect((idPatch as any).value).toBe("pre-existing");

            stop();
        });
    });

    describe("options inheritance", () => {
        it("child objects inherit options from root", async () => {
            let idCounter = 5000;
            const options: DeepSignalOptions = {
                onObjectAttached: ({ rawObject }) => {
                    if (Array.isArray(rawObject) || rawObject instanceof Set)
                        return;

                    rawObject["attachedProp"] = `inherited-${idCounter++}`;
                    return {};
                },
            };

            const state = deepSignal({ root: {} as any }, options);

            // Add nested structure
            state.root.child = {
                grandchild: {
                    value: "nested",
                },
            };

            // All should have IDs generated by the custom generator
            expect((state.root.child as any)["attachedProp"]).toMatch(
                /^inherited-/
            );
            expect(
                (state.root.child.grandchild as any)["attachedProp"]
            ).toMatch(/^inherited-/);
        });

        it("objects added to Sets inherit options", async () => {
            let counter = 9000;
            const options: DeepSignalOptions = {
                onObjectAttached: ({ rawObject }) => {
                    if (Array.isArray(rawObject) || rawObject instanceof Set)
                        return;

                    rawObject["attachedProp"] = `set-child-${counter++}`;
                    return {};
                },
            };

            const state = deepSignal({ s: new Set<any>() }, options);

            const obj = { nested: { value: 1 } };
            state.s.add(obj);

            // Iterate to get proxied object
            const proxied = Array.from(state.s)[0];

            // Object and nested object should have custom IDs
            expect((proxied as any)["attachedProp"]).toMatch(/^set-child-/);
            expect((proxied.nested as any)["attachedProp"]).toMatch(
                /^set-child-/
            );
        });
    });
});
