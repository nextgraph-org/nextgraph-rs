import type { Dataset, DatasetFactory, Quad } from "@rdfjs/types";
import type { ParserOptions } from "@ldo/rdf-utils";
import { serializedToQuads } from "@ldo/rdf-utils";

/**
 * Creates a dataset with a string input that could be JON-LD, Turtle, N-Triples, TriG, RDF*, or N3.
 * @param datasetFactory A datasetFactory that will initialize a returned dataset.\
 * @param data A string representation of RDF Data in JSON-LD, Turtle, N-Triples, TriG, RDF*, or N3.
 * @param options Parser options: {
 *   format?: string;
 *   factory?: RDF.DataFactory;
 *   baseIRI?: string;
 *   blankNodePrefix?: string;
 * }
 * @returns A dataset
 */
export default async function createDatasetFromSerializedInput<
  ReturnDataset extends Dataset = Dataset,
>(
  datasetFactory: DatasetFactory<Quad>,
  data: string,
  options?: ParserOptions,
): Promise<ReturnDataset> {
  const quads = await serializedToQuads(data, options);
  return datasetFactory.dataset(quads) as unknown as ReturnDataset;
}
