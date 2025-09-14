import { testData } from "./testData/testData.js";
import { shexjToContext } from "../src/context/shexjToContext.js";
import parser from "@shexjs/parser";
import type { Schema } from "shexj";

console.warn = () => {};

describe("context", () => {
  testData.forEach(({ name, shexc, successfulContext }) => {
    // Skip entries with empty context placeholder (compact-only tests)
    if (!successfulContext || !Object.keys(successfulContext).length) return;
    it(`Creates a context for ${name}`, async () => {
      const schema: Schema = parser
        .construct("https://ldo.js.org/")
        .parse(shexc);
      const context = await shexjToContext(schema);
      expect(context).toEqual(successfulContext);
    });
  });
});
