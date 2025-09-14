import type { DatasetChanges } from "@ldo/rdf-utils";
import type { BaseQuad, Dataset } from "@rdfjs/types";
import type { IBulkEditableDataset } from "./types.js";

/**
 * Performs a bulk update for a dataset even if it doesn't have a bulk method.
 * @param dataset - the input dataset
 * @param datasetChanges - changes to be applied
 */
export function updateDatasetInBulk<InAndOutQuad extends BaseQuad = BaseQuad>(
  dataset: Dataset<InAndOutQuad>,
  datasetChanges: DatasetChanges<InAndOutQuad>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((dataset as any).bulk) {
    (dataset as IBulkEditableDataset<InAndOutQuad>).bulk(datasetChanges);
  } else {
    if (datasetChanges.added) {
      dataset.addAll(datasetChanges.added);
    }
    if (datasetChanges.removed) {
      datasetChanges.removed.forEach((curQuad) => {
        dataset.delete(curQuad);
      });
    }
  }
}
