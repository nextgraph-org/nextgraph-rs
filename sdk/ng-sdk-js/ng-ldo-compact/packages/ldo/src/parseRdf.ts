import type { Dataset } from "@rdfjs/types";
import type { JsonLdDocument } from "jsonld";
import type { ParserOptions } from "n3";
import { createDatasetFromSerializedInput } from "@ldo/dataset";
import {
  createLdoDataset,
  createLdoDatasetFactory,
} from "./createLdoDataset.js";
import type { LdoDataset } from "./LdoDataset.js";

/**
 * @category Getting an LdoDataset
 *
 * Parses raw RDF and puts its results into an LdoDataset.
 *
 * @param data - The raw data to parse as a `string`.
 * @param parserOptions - Parser options from n3
 * @param parserOptions.format - The format the data is in. The following are acceptable formats: `Turtle`, `TriG`, `N-Triples`, `N-Quads`, `N3`, `Notation3`.
 * @param parserOptions.baseIRI - If this data is hosted at a specific location, you can provide the baseIRI of that location.
 * @param parserOptions.blankNodePrefix - If blank nodes should have a prefix, that should be provided here.
 * @param parserOptions.factory - a RDF Data Factory from  [`@rdfjs/data-model`](https://www.npmjs.com/package/@rdfjs/data-model).
 *
 * @returns An LdoDataset containing the parsed triples
 *
 * @example
 * ```typescript
 * import { parseRdf } from "ldo";
 *
 * const rawTurtle = "...";
 * const ldoDataset = await parseRdf(rawTurtle, { baseIRI: "https://example.com/" });
 * ```
 */
export async function parseRdf(
  data: string | JsonLdDocument | Dataset,
  parserOptions?: ParserOptions,
): Promise<LdoDataset> {
  const ldoDatasetFactory = createLdoDatasetFactory();
  if (typeof data === "string") {
    // Input data is serialized
    return await createDatasetFromSerializedInput(
      ldoDatasetFactory,
      data,
      parserOptions,
    );
  } else if (typeof (data as Dataset).add === "function") {
    // Input data is a dataset
    return createLdoDataset(data as Dataset);
  } else {
    return await createDatasetFromSerializedInput(
      ldoDatasetFactory,
      JSON.stringify(data),
      {
        format: "application/ld+json",
      },
    );
  }
}
