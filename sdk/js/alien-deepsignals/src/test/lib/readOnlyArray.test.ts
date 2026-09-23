import { describe, expect, it } from "vitest";
import { deepSignal, RAW_KEY } from "../../deepSignal.ts";
import { readOnlyArray } from "../../readOnlyArray.ts";

describe("Read only array", () => {
    it("prevents modifications", () => {
        const ds = deepSignal([0, 1, 2, 3, 4]);
        const readOnly = readOnlyArray(ds);

        expect(() => {
            // @ts-expect-error
            readOnly.push(2);
        }).toThrow(/Readonly arrays do not expose non-mutating functions/);

        expect(() => {
            // @ts-expect-error
            readOnly.sort();
        }).toThrow(/Readonly arrays do not expose non-mutating functions/);

        expect(() => {
            // @ts-expect-error
            readOnly.length = 2;
        }).toThrow(/Cannot modify readonly array./);

        expect(() => {
            // @ts-expect-error
            readOnly[1] = 5;
        }).toThrow(/Cannot modify readonly array./);

        expect(() => {
            // @ts-expect-error
            const raw = readOnly[RAW_KEY];
        }).toThrow(/Readonly arrays do not expose raw and meta data./);
    });
});
