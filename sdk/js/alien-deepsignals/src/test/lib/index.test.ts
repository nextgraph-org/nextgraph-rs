// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { deepSignal, shallow } from "../../index";
import { describe, it, expect, beforeEach } from "vitest";
import { effect } from "../..";
type Store = {
    a?: number;
    nested: { b?: number };
    array: (number | Store["nested"])[];
};

describe("deepsignal/core", () => {
    let nested = { b: 2 };
    let array = [3, nested];
    let state: Store = { a: 1, nested, array };
    let store = deepSignal(state);

    const window = globalThis as any;

    beforeEach(() => {
        nested = { b: 2 };
        array = [3, nested];
        state = { a: 1, nested, array };
        store = deepSignal(state);
    });

    describe("get - plain", () => {
        it("should return plain objects/arrays", () => {
            expect(store.nested).to.deep.equal({ b: 2 });
            expect(store.array).to.deep.equal([3, { b: 2 }]);
            expect(store.array[1]).to.deep.equal({ b: 2 });
        });

        it("should return plain primitives", () => {
            expect(store.a).to.equal(1);
            expect(store.nested.b).to.equal(2);
            expect(store.array[0]).to.equal(3);
            expect(
                typeof store.array[1] === "object" && store.array[1].b
            ).to.equal(2);
            expect(store.array.length).to.equal(2);
        });

        it("should support reading from getters", () => {
            const store = deepSignal({
                counter: 1,
                get double() {
                    return store.counter * 2;
                },
            });
            expect(store.double).to.equal(2);
            store.counter = 2;
            expect(store.double).to.equal(4);
        });

        it("should support getters returning other parts of the state", () => {
            const store = deepSignal({
                switch: "a",
                a: { data: "a" },
                b: { data: "b" },
                get aOrB() {
                    return store.switch === "a" ? store.a : store.b;
                },
            });
            expect(store.aOrB.data).to.equal("a");
            store.switch = "b";
            expect(store.aOrB.data).to.equal("b");
        });

        it("should support getters using ownKeys traps", () => {
            const state = deepSignal({
                x: {
                    a: 1,
                    b: 2,
                },
                get y() {
                    return Object.values(state.x);
                },
            });

            expect(state.y).to.deep.equal([1, 2]);
        });

        it("should work with normal functions", () => {
            const store = deepSignal({
                value: 1,
                isBigger: (newValue: number): boolean => store.value < newValue,
                sum(newValue: number): number {
                    return store.value + newValue;
                },
                replace: (newValue: number): void => {
                    store.value = newValue;
                },
            });
            expect(store.isBigger(2)).to.equal(true);
            expect(store.sum(2)).to.equal(3);
            expect(store.value).to.equal(1);
            store.replace(2);
            expect(store.value).to.equal(2);
        });
    });

    describe("set", () => {
        it("should update like plain objects/arrays", () => {
            expect(store.a).to.equal(1);
            expect(store.nested.b).to.equal(2);
            store.a = 2;
            store.nested.b = 3;
            expect(store.a).to.equal(2);
            expect(store.nested.b).to.equal(3);
        });

        // TODO: Remove the .value access semantics.
        it("should support setting values with setters", () => {
            const store = deepSignal({
                counter: 1,
                get double() {
                    return store.counter * 2;
                },
                set double(val) {
                    store.counter = val / 2;
                },
            });
            expect(store.counter).to.equal(1);
            store.double = 4;
            expect(store.counter).to.equal(2);
        });

        it("should update array length", () => {
            let state: Store = { a: 1, nested, array };
            let store = deepSignal(state);

            expect(store.array.length).to.equal(2);
            store.array.push(4);
            expect(store.array.length).to.equal(3);
            store.array.splice(1, 2);
            expect(store.array.length).to.equal(1);
        });

        it("should update when mutations happen", () => {
            expect(store.a).to.equal(1);
            store.a = 11;
            expect(store.a).to.equal(11);
        });

        it("should support setting getters on the fly", () => {
            const store = deepSignal<{ counter: number; double?: number }>({
                counter: 1,
            });
            Object.defineProperty(store, "double", {
                get: function () {
                    return store.counter * 2;
                },
            });
            expect(store.double).to.equal(2);
            store.counter = 2;
            expect(store.double).to.equal(4);
        });

        it("should copy object like plain JavaScript", () => {
            const store = deepSignal<{
                a?: { id: number; nested: { id: number } };
                b: { id: number; nested: { id: number } };
            }>({
                b: { id: 1, nested: { id: 1 } },
            });

            store.a = store.b;

            expect(store.a.id).to.equal(1);
            expect(store.b.id).to.equal(1);
            expect(store.a.nested.id).to.equal(1);
            expect(store.b.nested.id).to.equal(1);

            store.a.id = 2;
            store.a.nested.id = 2;
            expect(store.a.id).to.equal(2);
            expect(store.b.id).to.equal(2);
            expect(store.a.nested.id).to.equal(2);
            expect(store.b.nested.id).to.equal(2);

            store.b.id = 3;
            store.b.nested.id = 3;
            expect(store.b.id).to.equal(3);
            expect(store.a.id).to.equal(3);
            expect(store.a.nested.id).to.equal(3);
            expect(store.b.nested.id).to.equal(3);

            store.a.id = 4;
            store.a.nested.id = 4;
            expect(store.a.id).to.equal(4);
            expect(store.b.id).to.equal(4);
            expect(store.a.nested.id).to.equal(4);
            expect(store.b.nested.id).to.equal(4);
        });

        it("should be able to reset values with Object.assign", () => {
            const initialNested = { ...nested };
            const initialState = { ...state, nested: initialNested };
            store.a = 2;
            store.nested.b = 3;
            Object.assign(store, initialState);
            expect(store.a).to.equal(1);
            expect(store.nested.b).to.equal(2);
        });
    });

    describe("delete", () => {
        it("should delete properties before they are accessed", () => {
            delete store.a;
            expect(store.a).to.equal(undefined);
        });

        it("should delete properties after they are accessed", () => {
            expect(store.a).to.equal(1);
            delete store.a;
            expect(store.a).to.equal(undefined);
        });

        it("should delete nested properties before they are accessed", () => {
            delete store.nested.b;
            expect(store.nested.b).to.equal(undefined);
        });

        it("should delete nested properties after they are accessed", () => {
            expect(store.nested.b).to.equal(2);
            delete store.nested.b;
            expect(store.nested.b).to.equal(undefined);
        });

        it("should delete properties in arrays before they are accessed", () => {
            delete store.array[0];
            expect(store.array[0]).to.equal(undefined);
        });

        it("should delete properties in arrays after they are accessed", () => {
            expect(store.array[0]).to.equal(3);
            delete store.array[0];
            expect(store.array[0]).to.equal(undefined);
        });
    });

    describe("ownKeys", () => {
        it("should return own properties in objects", () => {
            const state: Record<string, number> = { a: 1, b: 2 };
            const store = deepSignal(state);
            let sum = 0;

            for (const property in store) {
                sum += store[property];
            }

            expect(sum).to.equal(3);
        });

        it("should return own properties in arrays", () => {
            const state: number[] = [1, 2];
            const store = deepSignal(state);
            let sum = 0;

            for (const property of store) {
                sum += property;
            }

            expect(sum).to.equal(3);
        });

        it("should spread objects correctly", () => {
            const store2 = { ...store };
            expect(store2.a).to.equal(1);
            expect(store2.nested.b).to.equal(2);
            expect(store2.array[0]).to.equal(3);
            expect(
                typeof store2.array[1] === "object" && store2.array[1].b
            ).to.equal(2);
        });

        it("should spread arrays correctly", () => {
            const array2 = [...store.array];
            expect(array2[0]).to.equal(3);
            expect(typeof array2[1] === "object" && array2[1].b).to.equal(2);
        });
    });

    describe("computations", () => {
        it("should subscribe to values mutated with setters", () => {
            const store = deepSignal({
                counter: 1,
                get double() {
                    return store.counter * 2;
                },
                set double(val) {
                    store.counter = val / 2;
                },
            });
            let counter = 0;
            let double = 0;

            effect(() => {
                counter = store.counter;
                double = store.double;
            });

            expect(counter).to.equal(1);
            expect(double).to.equal(2);
            store.double = 4;
            expect(counter).to.equal(2);
            expect(double).to.equal(4);
        });

        it("should subscribe to changes when an item is removed from the array", () => {
            const store = deepSignal([0, 0, 0]);
            let sum = 0;

            effect(() => {
                sum = 0;
                sum = store.reduce((sum) => sum + 1, 0);
            });

            expect(sum).to.equal(3);
            store.splice(2, 1);
            expect(sum).to.equal(2);
        });

        it("should subscribe to changes to for..in loops", () => {
            const state: Record<string, number> = { a: 0, b: 0 };
            const store = deepSignal(state);
            let sum = 0;

            effect(() => {
                sum = 0;
                for (const _ in store) {
                    sum += 1;
                }
            });

            expect(sum).to.equal(2);

            store.c = 0;
            expect(sum).to.equal(3);

            delete store.c;
            expect(sum).to.equal(2);
        });

        it("should not retrigger effects when unrelated object branches change", () => {
            const store = deepSignal({
                alpha: { value: 1 },
                beta: { value: 2 },
            });
            let runs = 0;

            effect(() => {
                runs += 1;
                store.alpha.value;
            });

            expect(runs).to.equal(1);
            store.beta.value = 3;
            expect(runs).to.equal(1);
        });

        it("should not retrigger effects for untouched Set entries", () => {
            const store = deepSignal(
                {
                    set: new Set<any>([
                        { id: "a", data: { value: 1 } },
                        { id: "b", data: { value: 2 } },
                    ]),
                },
                {
                    syntheticIdPropertyName: "id",
                    propGenerator: ({ object }) => ({ syntheticId: object.id }),
                }
            );

            const [entryA, entryB] = Array.from(store.set);

            let runs = 0;
            effect(() => {
                runs += 1;
                (entryA as any).data.value;
            });

            expect(runs).to.equal(1);
            (entryB as any).data.value = 5;
            expect(runs).to.equal(1);
        });

        it("should subscribe to array iteration via Symbol.iterator", () => {
            const store = deepSignal([1, 2]);
            let total = 0;

            effect(() => {
                total = 0;
                for (const value of store) {
                    total += value;
                }
            });

            expect(total).to.equal(3);
            store.push(3);
            expect(total).to.equal(6);
        });

        it("should subscribe to Set iteration via Symbol.iterator", () => {
            const store = deepSignal({ set: new Set([1, 2]) });
            let total = 0;

            effect(() => {
                total = 0;
                for (const value of store.set) {
                    total += value as number;
                }
            });

            expect(total).to.equal(3);
            store.set.add(3);
            expect(total).to.equal(6);
            store.set.delete(1);
            expect(total).to.equal(5);
        });

        it("should subscribe when using Set iterator helper chains", () => {
            const store = deepSignal({ set: new Set([1]) });
            let reduced = 0;

            effect(() => {
                reduced = store.set
                    .map((value) => value as number)
                    .reduce((acc, value) => acc + value, 0);
            });

            expect(reduced).to.equal(1);
            store.set.add(2);
            expect(reduced).to.equal(3);
            store.set.delete(1);
            expect(reduced).to.equal(2);
        });

        it("should subscribe to changes for Object.getOwnPropertyNames()", () => {
            const state: Record<string, number> = { a: 1, b: 2 };
            const store = deepSignal(state);
            let sum = 0;

            effect(() => {
                sum = 0;
                const keys = Object.getOwnPropertyNames(store);
                for (const _ of keys) {
                    sum += 1;
                }
            });

            expect(sum).to.equal(2);

            store.c = 0;
            expect(sum).to.equal(3);

            delete store.a;
            expect(sum).to.equal(2);
        });

        it("should subscribe to changes to Object.keys/values/entries()", () => {
            const state: Record<string, number> = { a: 1, b: 2 };
            const store = deepSignal(state);
            let keys = 0;
            let values = 0;
            let entries = 0;

            effect(() => {
                keys = 0;
                Object.keys(store).forEach(() => (keys += 1));
            });

            effect(() => {
                values = 0;
                Object.values(store).forEach(() => (values += 1));
            });

            effect(() => {
                entries = 0;
                Object.entries(store).forEach(() => (entries += 1));
            });

            expect(keys).to.equal(2);
            expect(values).to.equal(2);
            expect(entries).to.equal(2);

            store.c = 0;
            expect(keys).to.equal(3);
            expect(values).to.equal(3);
            expect(entries).to.equal(3);

            delete store.a;
            expect(keys).to.equal(2);
            expect(values).to.equal(2);
            expect(entries).to.equal(2);
        });

        it("should subscribe to changes to for..of loops", () => {
            const store = deepSignal([0, 0]);
            let sum = 0;

            effect(() => {
                sum = 0;
                for (const _ of store) {
                    sum += 1;
                }
            });

            expect(sum).to.equal(2);

            store.push(0);
            expect(sum).to.equal(3);

            store.splice(0, 1);
            expect(sum).to.equal(2);
        });

        it("should subscribe to implicit changes in array items", () => {
            const store = deepSignal(["foo", "bar"]);
            let x = "";

            effect(() => {
                x = store.join(" ");
                console.log("joined", x);
            });

            expect(x).to.equal("foo bar");

            store.push("baz");
            expect(x).to.equal("foo bar baz");

            store.splice(0, 1);
            expect(x).to.equal("bar baz");

            store.splice(1, 1, "bam");
            expect(x).to.equal("bar bam");
        });

        it("should subscribe to changes when deleting properties", () => {
            let x, y;

            effect(() => {
                x = store.a;
            });

            effect(() => {
                y = store.nested.b;
            });

            expect(x).to.equal(1);
            delete store.a;
            expect(x).to.equal(undefined);

            expect(y).to.equal(2);
            delete store.nested.b;
            expect(y).to.equal(undefined);
        });

        it("should subscribe to changes when mutating objects", () => {
            let x, y;

            const store = deepSignal<{
                a?: { id: number; nested: { id: number } };
                b: { id: number; nested: { id: number } }[];
            }>({
                b: [
                    { id: 1, nested: { id: 1 } },
                    { id: 2, nested: { id: 2 } },
                ],
            });

            effect(() => {
                x = store.a?.id;
            });

            effect(() => {
                y = store.a?.nested.id;
            });

            expect(x).to.equal(undefined);
            expect(y).to.equal(undefined);

            store.a = store.b[0];

            expect(x).to.equal(1);
            expect(y).to.equal(1);

            store.a = store.b[1];
            expect(x).to.equal(2);
            expect(y).to.equal(2);

            store.a = undefined;
            expect(x).to.equal(undefined);
            expect(y).to.equal(undefined);

            store.a = store.b[1];
            expect(x).to.equal(2);
            expect(y).to.equal(2);
        });

        it("should trigger effects after mutations happen", () => {
            let x;
            effect(() => {
                x = store.a;
            });
            expect(x).to.equal(1);
            store.a = 11;
            expect(x).to.equal(11);
        });

        it("should subscribe corretcly from getters", () => {
            let x;
            const store = deepSignal({
                counter: 1,
                get double() {
                    return store.counter * 2;
                },
            });
            effect(() => (x = store.double));
            expect(x).to.equal(2);
            store.counter = 2;
            expect(x).to.equal(4);
        });

        it("should subscribe corretcly from getters returning other parts of the store", () => {
            let data;
            const store = deepSignal({
                switch: "a",
                a: { data: "a" },
                b: { data: "b" },
                get aOrB() {
                    return store.switch === "a" ? store.a : store.b;
                },
            });
            effect(() => (data = store.aOrB.data));
            expect(data).to.equal("a");
            store.switch = "b";
            expect(data).to.equal("b");
        });

        it("should be able to reset values with Object.assign and still react to changes", () => {
            const initialNested = { ...nested };
            const initialState = { ...state, nested: initialNested };
            let a, b;

            effect(() => {
                a = store.a;
            });
            effect(() => {
                b = store.nested.b;
            });

            store.a = 2;
            store.nested.b = 3;

            expect(a).to.equal(2);
            expect(b).to.equal(3);

            Object.assign(store, initialState);

            expect(a).to.equal(1);
            expect(b).to.equal(2);
        });
    });

    describe("refs", () => {
        it("should change if children changed", async () => {
            const signalObj = deepSignal({
                primitive: 1,
                nestedObject: { primitive: 2 },
                nestedSetOfPrimitives: new Set([1, 2, "three"]),
                nestedSetOfObjects: new Set([
                    { "@id": "obj1", primitive: true },
                    { "@id": "obj2", primitive: "false" },
                ]),
                nestedArrayOfPrimitives: [1, 2, "three"],
                nestedArrayOfObjects: [
                    { "@id": "obj1", primitive: true },
                    { "@id": "obj2", primitive: "false" },
                ],
            });

            // Capture initial references
            let no = signalObj.nestedObject;
            let nop = signalObj.nestedObject.primitive;
            let nsop = signalObj.nestedSetOfPrimitives;
            let nsoo = signalObj.nestedSetOfObjects;
            let [nsoo1, nsoo2] = [...signalObj.nestedSetOfObjects];
            let naop = signalObj.nestedArrayOfPrimitives;
            let naoo = signalObj.nestedArrayOfObjects;
            let [naoo1, naoo2] = signalObj.nestedArrayOfObjects;

            // Mutate root primitive - should not affect nested proxies
            signalObj.primitive = 2;
            expect(signalObj.nestedObject).toBe(no);
            expect(signalObj.nestedObject.primitive).toBe(nop);
            expect(signalObj.nestedSetOfPrimitives).toBe(nsop);
            expect(signalObj.nestedSetOfObjects).toBe(nsoo);
            expect(signalObj.nestedArrayOfPrimitives).toBe(naop);
            expect(signalObj.nestedArrayOfObjects).toBe(naoo);

            // Mutate nested object primitive - should replace nestedObject proxy
            signalObj.nestedObject.primitive = 3;
            expect(signalObj.nestedObject.primitive).toBe(3);
            expect(signalObj.nestedObject).not.toBe(no);
            no = signalObj.nestedObject;
            // Unrelated proxies should remain the same
            expect(signalObj.nestedSetOfPrimitives).toBe(nsop);
            expect(signalObj.nestedSetOfObjects).toBe(nsoo);
            expect(signalObj.nestedArrayOfPrimitives).toBe(naop);
            expect(signalObj.nestedArrayOfObjects).toBe(naoo);

            // Mutate Set of primitives - should replace the Set proxy
            signalObj.nestedSetOfPrimitives.add(4);
            expect(signalObj.nestedSetOfPrimitives).not.toBe(nsop);
            nsop = signalObj.nestedSetOfPrimitives;
            expect(signalObj.nestedSetOfPrimitives.has(4)).toBe(true);
            // Unrelated proxies should remain the same
            expect(signalObj.nestedObject).toBe(no);
            expect(signalObj.nestedSetOfObjects).toBe(nsoo);
            expect(signalObj.nestedArrayOfPrimitives).toBe(naop);
            expect(signalObj.nestedArrayOfObjects).toBe(naoo);

            // Mutate object inside Set - should replace Set proxy and the object proxy
            nsoo1.primitive = false;
            expect([...signalObj.nestedSetOfObjects][1]).toBe(nsoo2);
            expect([...signalObj.nestedSetOfObjects][0]).not.toBe(nsoo1);
            expect(signalObj.nestedSetOfObjects).not.toBe(nsoo);
            nsoo = signalObj.nestedSetOfObjects;
            [nsoo1, nsoo2] = [...signalObj.nestedSetOfObjects];
            // Unrelated proxies should remain the same
            expect(signalObj.nestedObject).toBe(no);
            expect(signalObj.nestedSetOfPrimitives).toBe(nsop);
            expect(signalObj.nestedArrayOfPrimitives).toBe(naop);
            expect(signalObj.nestedArrayOfObjects).toBe(naoo);

            // Mutate array of primitives - should replace the array proxy
            signalObj.nestedArrayOfPrimitives.push(4);
            expect(signalObj.nestedArrayOfPrimitives).not.toBe(naop);
            naop = signalObj.nestedArrayOfPrimitives;
            expect(signalObj.nestedArrayOfPrimitives.length).toBe(4);
            // Unrelated proxies should remain the same
            expect(signalObj.nestedObject).toBe(no);
            expect(signalObj.nestedSetOfPrimitives).toBe(nsop);
            expect(signalObj.nestedSetOfObjects).toBe(nsoo);
            expect(signalObj.nestedArrayOfObjects).toBe(naoo);

            // Mutate object inside array - should replace array proxy and the object proxy
            naoo1.primitive = false;
            expect(signalObj.nestedArrayOfObjects[0]).not.toBe(naoo1);
            expect(signalObj.nestedArrayOfObjects[1]).toBe(naoo2);
            expect(signalObj.nestedArrayOfObjects).not.toBe(naoo);
            naoo = signalObj.nestedArrayOfObjects;
            [naoo1, naoo2] = signalObj.nestedArrayOfObjects;
            // Unrelated proxies should remain the same
            expect(signalObj.nestedObject).toBe(no);
            expect(signalObj.nestedSetOfPrimitives).toBe(nsop);
            expect(signalObj.nestedSetOfObjects).toBe(nsoo);
            expect(signalObj.nestedArrayOfPrimitives).toBe(naop);
        });

        it("should return the same proxy if initialized more than once", () => {
            const state = {};
            const store1 = deepSignal(state);
            const store2 = deepSignal(state);
            expect(store1).to.equal(store2);
        });
    });

    describe("unsupported data structures", () => {
        it("should throw when trying to deepsignal a class instance", () => {
            class MyClass {}
            const obj = new MyClass();
            expect(() => deepSignal(obj)).to.throw();
        });

        it("should not wrap a class instance", () => {
            class MyClass {}
            const obj = new MyClass();
            const store = deepSignal({ obj });
            expect(store.obj).to.equal(obj);
        });

        it("should not wrap built-ins in proxies", () => {
            window.MyClass = class MyClass {};
            const obj = new window.MyClass();
            const store = deepSignal({ obj });
            expect(store.obj).to.equal(obj);
        });

        // it("should not wrap elements in proxies", () => {
        // 	const el = window.document.createElement("div");
        // 	const store = deepSignal({ el });
        // 	expect(store.el).to.equal(el);
        // });

        it("should wrap global objects", () => {
            window.obj = { b: 2 };
            const store = deepSignal(window.obj);
            expect(store).to.not.equal(window.obj);
            expect(store).to.deep.equal({ b: 2 });
            expect(store.b).to.equal(2);
        });

        it("should not wrap dates", () => {
            const date = new Date();
            const store = deepSignal({ date });
            expect(store.date).to.equal(date);
        });

        it("should not wrap regular expressions", () => {
            const regex = new RegExp("");
            const store = deepSignal({ regex });
            expect(store.regex).to.equal(regex);
        });

        it("should not wrap Map", () => {
            const map = new Map();
            const store = deepSignal({ map });
            expect(store.map).to.equal(map);
        });

        it("should wrap Set and emit patches on structural changes", () => {
            const set = new Set<number>([1]);
            const store = deepSignal({ set });
            // The Set itself should be proxied (different reference)
            expect(store.set).to.not.equal(set);
            // Size observable via manual mutation + patch emission (indirectly validated in watchPatches Set test)
            store.set.add(2);
            store.set.delete(1);
            expect(store.set.has(2)).to.equal(true);
        });

        it("should expose reactive Set size without throwing", () => {
            const store = deepSignal({ set: new Set([1, 2]) });
            let size = 0;

            effect(() => {
                size = store.set.size;
            });

            expect(store.set.size).to.equal(2);
            expect(size).to.equal(2);

            store.set.add(3);
            expect(store.set.size).to.equal(3);
            expect(size).to.equal(3);

            store.set.delete(1);
            expect(store.set.size).to.equal(2);
            expect(size).to.equal(2);
        });
    });

    describe("symbols", () => {
        it("should observe symbols", () => {
            const key = Symbol("key");
            let x;
            const store = deepSignal<{ [key: symbol]: any }>({});
            effect(() => (x = store[key]));

            expect(store[key]).to.equal(undefined);
            expect(x).to.equal(undefined);

            store[key] = true;

            expect(store[key]).to.equal(true);
            expect(x).to.equal(true);
        });

        it("should not observe well-known symbols", () => {
            const key = Symbol.isConcatSpreadable;
            let x;
            const state = deepSignal<{ [key: symbol]: any }>({});
            effect(() => (x = state[key]));

            expect(state[key]).to.equal(undefined);
            expect(x).to.equal(undefined);

            state[key] = true;
            expect(state[key]).to.equal(true);
            expect(x).to.equal(undefined);
        });
    });

    describe("shallow", () => {
        it("should not proxy shallow objects", () => {
            const shallowObj1 = { a: 1 };
            let shallowObj2 = { b: 2 };
            const deepObj = { c: 3 };
            shallowObj2 = shallow(shallowObj2);
            const store = deepSignal({
                shallowObj1: shallow(shallowObj1),
                shallowObj2,
                deepObj,
            });
            expect(store.shallowObj1.a).to.equal(1);
            expect(store.shallowObj2.b).to.equal(2);
            expect(store.deepObj.c).to.equal(3);
            expect(store.shallowObj1).to.equal(shallowObj1);
            expect(store.shallowObj2).to.equal(shallowObj2);
            expect(store.deepObj).to.not.equal(deepObj);
        });

        it("should not proxy shallow objects if shallow is called on the reference before accessing the property", () => {
            const shallowObj = { a: 1 };
            const deepObj = { c: 3 };
            const store = deepSignal({ shallowObj, deepObj });
            shallow(shallowObj);
            expect(store.shallowObj.a).to.equal(1);
            expect(store.deepObj.c).to.equal(3);
            expect(store.shallowObj).to.equal(shallowObj);
            expect(store.deepObj).to.not.equal(deepObj);
        });

        it("should observe changes in the shallow object if the reference changes", () => {
            const obj = { a: 1 };
            const shallowObj = shallow(obj);
            const store = deepSignal({ shallowObj });
            let x;
            effect(() => {
                x = store.shallowObj.a;
            });
            expect(x).to.equal(1);
            store.shallowObj = shallow({ a: 2 });
            expect(x).to.equal(2);
        });

        it("should stop observing changes in the shallow object if the reference changes and it's not shallow anymore", () => {
            const obj = { a: 1 };
            const shallowObj = shallow(obj);
            const store = deepSignal<{ obj: typeof obj }>({ obj: shallowObj });
            let x;
            effect(() => {
                x = store.obj.a;
            });
            expect(x).to.equal(1);
            store.obj = { a: 2 };
            expect(x).to.equal(2);
            store.obj.a = 3;
            expect(x).to.equal(3);
        });

        it("should not observe changes in the props of the shallow object", () => {
            const obj = { a: 1 };
            const shallowObj = shallow(obj);
            const store = deepSignal({ shallowObj });
            let x;
            effect(() => {
                x = store.shallowObj.a;
            });
            expect(x).to.equal(1);
            store.shallowObj.a = 2;
            expect(x).to.equal(1);
        });
    });
});
