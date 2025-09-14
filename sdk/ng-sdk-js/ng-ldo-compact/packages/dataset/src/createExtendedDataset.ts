import type {
  Dataset,
  DatasetCoreFactory,
  DatasetCore,
  Quad,
} from "@rdfjs/types";
import ExtendedDatasetFactory from "./ExtendedDatasetFactory.js";
import * as rdfds from "@rdfjs/dataset";
import type ExtendedDataset from "./ExtendedDataset.js";

const initializeDatasetCore: (typeof rdfds)["dataset"] =
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  rdfds.default?.dataset || rdfds.dataset;

/**
 * Creates a dataset factory that generates ExtendedDatasets
 * @returns DatasetFactory
 */
export function createExtendedDatasetFactory(): ExtendedDatasetFactory<Quad> {
  const datasetFactory: DatasetCoreFactory<Quad> = {
    dataset: (quads?: Dataset<Quad> | Quad[]): DatasetCore<Quad> => {
      return initializeDatasetCore<Quad>(
        Array.isArray(quads) ? quads : quads?.toArray(),
      );
    },
  };
  return new ExtendedDatasetFactory<Quad>(datasetFactory);
}

/**
 * Creates an ExtendedDataset
 * @param quads: A dataset or array of Quads to initialize the dataset.
 * @returns Dataset
 */
export default function createExtendedDataset(
  quads?: Dataset<Quad> | Quad[],
): ExtendedDataset<Quad> {
  const extendedDatasetFactory = createExtendedDatasetFactory();
  return extendedDatasetFactory.dataset(quads);
}
