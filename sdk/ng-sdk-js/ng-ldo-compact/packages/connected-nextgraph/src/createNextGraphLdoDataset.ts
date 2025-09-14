import { ConnectedLdoDataset } from "@ldo/connected";
import { nextGraphConnectedPlugin } from "./NextGraphConnectedPlugin.js";
import { createDatasetFactory } from "@ldo/dataset";
import { createTransactionDatasetFactory } from "@ldo/subscribable-dataset";

export function createNextGraphLdoDataset() {
  const nextGraphLdoDataset = new ConnectedLdoDataset(
    [nextGraphConnectedPlugin],
    createDatasetFactory(),
    createTransactionDatasetFactory(),
  );
  return nextGraphLdoDataset;
}
