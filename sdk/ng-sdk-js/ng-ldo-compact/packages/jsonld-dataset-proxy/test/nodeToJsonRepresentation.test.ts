import { createDataset } from "@ldo/dataset";
import { ContextUtil } from "../src/ContextUtil.js";
import { nodeToJsonldRepresentation } from "../src/util/nodeToJsonldRepresentation.js";
import { defaultGraph, literal } from "@ldo/rdf-utils";
import { ProxyContext } from "../src/index.js";

describe("objectToJsonRepresentation", () => {
  const extraParams: ProxyContext = new ProxyContext({
    dataset: createDataset(),
    contextUtil: new ContextUtil({}),
    writeGraphs: [defaultGraph()],
    languageOrdering: ["@none", "@other"],
  });

  it("returns a string for hexBinary", () => {
    expect(
      nodeToJsonldRepresentation(
        literal("F03493", "http://www.w3.org/2001/XMLSchema#hexBinary"),
        extraParams,
      ),
    ).toBe("F03493");
  });

  it("returns a string for HTML", () => {
    expect(
      nodeToJsonldRepresentation(
        literal(
          "<body></body>",
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML",
        ),
        extraParams,
      ),
    ).toBe("<body></body>");
  });

  it("returns a string for anyUri", () => {
    expect(
      nodeToJsonldRepresentation(
        literal(
          "http://example.com",
          "http://www.w3.org/2001/XMLSchema#anyURI",
        ),
        extraParams,
      ),
    ).toBe("http://example.com");
  });

  it("returns a string for an unrecognized datatype", () => {
    expect(
      nodeToJsonldRepresentation(
        literal("meh", "http://weirddatatype.com"),
        extraParams,
      ),
    ).toBe("meh");
  });

  it("throws an error when it encoutners a quad that is not a Liter, NamedNode, or BlankNode", () => {
    expect(() =>
      // @ts-expect-error defaultGraph is not allowed
      nodeToJsonldRepresentation(defaultGraph(), extraParams),
    ).toThrow("Can only convert NamedNodes or Literals or BlankNodes");
  });
});
