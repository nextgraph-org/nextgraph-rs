import { isSolidLeafUri } from "../src/util/isSolidUri";
import { describe, it, expect } from "vitest";

describe("isLeafUri", () => {
  it("returns true if the given value is a leaf URI", () => {
    expect(isSolidLeafUri("https://example.com/index.ttl")).toBe(true);
  });
});
