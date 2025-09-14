import { ConnectedLdoDataset } from "@ldo/connected";
import { createDatasetFactory } from "@ldo/dataset";
import { createTransactionDatasetFactory } from "@ldo/subscribable-dataset";
import { mockConnectedPlugin } from "./MockConnectedPlugin.js";

export function createMockConnectedLdoDataset() {
  const nextGraphLdoDataset = new ConnectedLdoDataset(
    [mockConnectedPlugin],
    createDatasetFactory(),
    createTransactionDatasetFactory(),
  );
  return nextGraphLdoDataset;
}
