import {
  getProxyFromObject,
  getSubjectProxyFromObject,
  isSetProxy,
  isSubjectProxy,
} from "../src/index.js";

describe("isSubjectProxy", () => {
  it("returns false if undefined is passed as a parameter", () => {
    expect(isSubjectProxy(undefined)).toBe(false);
  });

  it("throws an error if the given object isn't a subject proxy", () => {
    expect(() => getSubjectProxyFromObject({ cool: "bean" })).toThrowError(
      `[object Object] is not a Jsonld Dataset Proxy`,
    );
  });
});

describe("isProxy", () => {
  it("throws an error if the given object isn't a proxy", () => {
    expect(() => getProxyFromObject({ cool: "bean" })).toThrowError(
      `[object Object] is not a Jsonld Dataset Proxy`,
    );
  });
});

describe("isSetProxy", () => {
  it("returns false if undefined is passed as a parameter", () => {
    expect(isSetProxy(undefined)).toBe(false);
  });

  it("returns false if string is passed as a parameter", () => {
    expect(isSetProxy("hello")).toBe(false);
  });
});
