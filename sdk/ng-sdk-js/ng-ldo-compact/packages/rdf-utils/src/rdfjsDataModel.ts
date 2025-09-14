/* eslint-disable @typescript-eslint/ban-ts-comment */
// src/utils/rdfjs-data-model-interop.ts
import * as rdfdmNamespace from "@rdfjs/data-model";

// The interop shim
let RdfDataModelResolved;
if (
  // @ts-ignore
  rdfdmNamespace.default &&
  // @ts-ignore
  typeof rdfdmNamespace.default.namedNode === "function"
) {
  // @ts-ignore
  RdfDataModelResolved = rdfdmNamespace.default;
} else {
  RdfDataModelResolved = rdfdmNamespace;
}

export const quad: (typeof rdfdmNamespace)["quad"] = RdfDataModelResolved.quad;
export const namedNode: (typeof rdfdmNamespace)["namedNode"] =
  RdfDataModelResolved.namedNode;
export const blankNode: (typeof rdfdmNamespace)["blankNode"] =
  RdfDataModelResolved.blankNode;
export const literal: (typeof rdfdmNamespace)["literal"] =
  RdfDataModelResolved.literal;
export const defaultGraph: (typeof rdfdmNamespace)["defaultGraph"] =
  RdfDataModelResolved.defaultGraph;
