import { createDataset } from "../src/index.js";
// Required for advanced features:
import * as rdfds from "@rdfjs/dataset";
import { ExtendedDatasetFactory } from "../src/index.js";
import { namedNode, quad, literal } from "@ldo/rdf-utils";
import type {
  Dataset,
  Quad,
  DatasetCoreFactory,
  DatasetCore,
} from "@rdfjs/types";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { dataset: initializeDatasetCore } = rdfds.default || rdfds;

/**
 * Create a dataset with default settings
 */
const defaultDataset = createDataset();

/**
 * Create a dataset with default settings and initialized values
 */
const initializedQuads = [
  quad(
    namedNode("http://example.org/cartoons#Tom"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Cat"),
  ),
  quad(
    namedNode("http://example.org/cartoons#Tom"),
    namedNode("http://example.org/cartoons#name"),
    literal("Tom"),
  ),
];
const defaultDataset2 = createDataset(initializedQuads);

/**
 * (Advanced Feature) Create a dataset by injecting a chosen datasetCore and datasetCoreFactory
 */
const datasetFactory: DatasetCoreFactory = {
  dataset: (quads?: Dataset<Quad> | Quad[]): DatasetCore => {
    return initializeDatasetCore(
      Array.isArray(quads) ? quads : quads?.toArray(),
    );
  },
};
const extendedDatasetFactory = new ExtendedDatasetFactory(datasetFactory);
const customDataset = extendedDatasetFactory.dataset(initializedQuads);

/**
 * Do all the methods of the RDFJS Dataset interface. For a full list of methods, go to
 * https://rdf.js.org/dataset-spec/#data-interfaces
 */
defaultDataset.add(
  quad(
    namedNode("http://example.org/cartoons#Miuki"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Cat"),
  ),
);
const combinedDataset = defaultDataset.union(defaultDataset2);
const differenceDataset = combinedDataset.difference(customDataset);
// Prints true because "defaultDataset2" and "customDataset" have equal values
// combinedDataset = defaultDataset ∪ defaultDataset2
// differenceDatasset = defaultDataset \ customDataset
// Therefore differenceDataset == defaultDataset
console.log(differenceDataset.equals(defaultDataset));
