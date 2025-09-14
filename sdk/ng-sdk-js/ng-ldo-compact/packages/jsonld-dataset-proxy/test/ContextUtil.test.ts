import { namedNode } from "@ldo/rdf-utils";
import { ContextUtil } from "../src/ContextUtil.js";
import { scopedContext } from "./scopedExampleData.js";

describe("ContextUtil", () => {
  describe("keyToIri and iriToKey", () => {
    it("handles a context that is simply a string map", () => {
      const fakeContext = {
        name: "http://hl7.org/fhir/name",
      };
      const contextUtil = new ContextUtil(fakeContext);
      expect(contextUtil.keyToIri("name", [])).toBe("http://hl7.org/fhir/name");
    });

    it("returns the given key if it is not in the context", () => {
      const contextUtil = new ContextUtil({});
      expect(contextUtil.keyToIri("name", [])).toBe("name");
      expect(contextUtil.iriToKey("http://hl7.org/fhir/name", [])).toBe(
        "http://hl7.org/fhir/name",
      );
    });

    it("handles a context that exists, but does not have an id", () => {
      const contextUtil = new ContextUtil({
        name: { "@type": "http://www.w3.org/2001/XMLSchema#string" },
      });
      expect(contextUtil.keyToIri("name", [])).toBe("name");
    });

    it("handles a nested context", () => {
      const contextUtil = new ContextUtil(scopedContext);
      expect(
        contextUtil.keyToIri("element", [
          namedNode("http://example.com/Bender"),
        ]),
      ).toBe("http://example.com/element");
      expect(
        contextUtil.iriToKey("http://example.com/element", [
          namedNode("http://example.com/Bender"),
        ]),
      ).toBe("element");
    });
  });

  describe("getType", () => {
    it("returns xsd:string if no type is provided", () => {
      const contextUtil = new ContextUtil({
        name: { "@id": "http://hl7.org/fhir/name" },
      });
      expect(contextUtil.getDataType("name", [])).toBe(
        "http://www.w3.org/2001/XMLSchema#string",
      );
    });
  });

  describe("isSet", () => {
    it("indicates that the special @isCollection field means array", () => {
      const contextUtil = new ContextUtil(scopedContext);
      expect(
        contextUtil.isSet("element", [namedNode("http://example.com/Avatar")]),
      ).toBe(true);
    });
  });
});
