import parser from "@shexjs/parser";
import { testData } from "./testData/testData.js";
import { shexjToTyping } from "../src/typing/shexjToTyping.js";
import type { Schema } from "shexj";

console.warn = () => {};

describe("typing", () => {
  testData.forEach((td) => {
    const { name, shexc, successfulTypings } = td;
    if (!successfulTypings) return; // skip entries only meant for compact tests
    it(`Creates typings for ${name}`, async () => {
      const schema: Schema = parser
        .construct("https://ldo.js.org/")
        .parse(shexc);
      const [typings] = await shexjToTyping(schema);
      expect(typings.typingsString).toBe(successfulTypings);
      // Compact format tested in typing.compact.test.ts
    });
  });
});
