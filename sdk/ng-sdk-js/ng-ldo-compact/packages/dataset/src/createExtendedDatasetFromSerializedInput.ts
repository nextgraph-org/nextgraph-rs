import type { Quad } from "@rdfjs/types";
import type { ParserOptions } from "@ldo/rdf-utils";
import createDatasetFromSerializedInput from "./createDatasetFromSerializedInput.js";
import { createExtendedDatasetFactory } from "./createExtendedDataset.js";
import type ExtendedDataset from "./ExtendedDataset.js";

/**
 * Creates an ExtendedDataset with a string input that could be JSON-LD, Turtle, N-Triples, TriG, RDF*, or N3.
 * @param data A string representation of RDF Data in JSON-LD, Turtle, N-Triples, TriG, RDF*, or N3.
 * @param options Parser options: {
 *   format?: string;
 *   factory?: RDF.DataFactory;
 *   baseIRI?: string;
 *   blankNodePrefix?: string;
 * }
 * @returns A dataset
 */
export default async function createExtendedDatasetFromSerializedInput(
  data: string,
  options?: ParserOptions,
): Promise<ExtendedDataset<Quad>> {
  const datasetFactory = createExtendedDatasetFactory();
  return createDatasetFromSerializedInput<ExtendedDataset<Quad>>(
    datasetFactory,
    data,
    options,
  );
}
