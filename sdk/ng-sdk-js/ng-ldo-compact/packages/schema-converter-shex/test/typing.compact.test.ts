import parser from "@shexjs/parser";
import { testData } from "./testData/testData.js";
import { shexjToTyping } from "../src/typing/shexjToTyping.js";
import type { Schema } from "shexj";

console.warn = () => {};

describe("typing-compact", () => {
  testData.forEach((td) => {
    const { name, shexc, successfulCompactTypings } = td;
    if (!successfulCompactTypings) return; // skip if neither
    it(`Creates compact typings for ${name}`, async () => {
      const schema: Schema = parser
        .construct("https://ldo.js.org/")
        .parse(shexc);
      const [compact] = await shexjToTyping(schema, { format: "compact" });
      const normalize = (s: string) =>
        s
          .replace(/\r\n/g, "\n")
          .replace(/\n+$/s, "\n")
          // Ignore leading indentation differences
          .replace(/^ +/gm, "");
      expect(normalize(compact.typingsString)).toBe(
        normalize(successfulCompactTypings)
      );
    });
  });
});
