import type { BaseQuad, Dataset, Quad } from "@rdfjs/types";
import { quad as createQuad } from "./rdfjsDataModel.js";
import { datasetToString } from "./datasetConverters.js";

/**
 * An interface representing the changes made
 */
export interface DatasetChanges<InAndOutQuad extends BaseQuad = BaseQuad> {
  added?: Dataset<InAndOutQuad, InAndOutQuad>;
  removed?: Dataset<InAndOutQuad, InAndOutQuad>;
}

/**
 * Takes Dataset Changes and converts them to SPARQL UPDATE
 * @param changes: Dataset Changes
 * @returns String SPARQL Update
 */
export async function changesToSparqlUpdate(changes: DatasetChanges<Quad>) {
  let output = "";
  if (changes.removed) {
    const removedTriples = changes.removed.map((quad) =>
      createQuad(quad.subject, quad.predicate, quad.object),
    );
    output += `DELETE DATA { ${await datasetToString(removedTriples, {
      format: "N-Triples",
    })} }`;
  }
  if (changes.added && changes.removed) {
    output += "; ";
  }
  if (changes.added) {
    const addedTriples = changes.added.map((quad) =>
      createQuad(quad.subject, quad.predicate, quad.object),
    );
    output += `INSERT DATA { ${await datasetToString(addedTriples, {
      format: "N-Triples",
    })} }`;
  }
  return output.replaceAll("\n", " ");
}
