import type { Quad } from "@rdfjs/types";
import type { ParserOptions } from "@ldo/rdf-utils";
import { createDatasetFromSerializedInput } from "@ldo/dataset";
import { createSubscribableDatasetFactory } from "./createSubscribableDataset.js";
import type { ISubscribableDataset } from "./types.js";

/**
 * Creates a SubscribableDataset with a string input that could be JSON-LD, Turtle, N-Triples, TriG, RDF*, or N3.
 * @param data A string representation of RDF Data in JSON-LD, Turtle, N-Triples, TriG, RDF*, or N3.
 * @param options Parser options: {
 *   format?: string;
 *   factory?: RDF.DataFactory;
 *   baseIRI?: string;
 *   blankNodePrefix?: string;
 * }
 * @returns A dataset
 */
export async function createWrapperSubscribableDatasetFromSerializedInput(
  data: string,
  options?: ParserOptions,
): Promise<ISubscribableDataset<Quad>> {
  const datasetFactory = createSubscribableDatasetFactory();
  return createDatasetFromSerializedInput<ISubscribableDataset<Quad>>(
    datasetFactory,
    data,
    options,
  );
}
