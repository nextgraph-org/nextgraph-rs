import { ConnectedLdoDataset } from "@ldo/connected";
import { solidConnectedPlugin } from "./SolidConnectedPlugin.js";
import { createDatasetFactory } from "@ldo/dataset";
import { createTransactionDatasetFactory } from "@ldo/subscribable-dataset";

/**
 * Creates a ConnectedLdoDataset with the Solid plugin
 * @returns a ConnectedLdoDataset<SolidConnectedPlugin[]>
 *
 * @example
 * ```typescript
 * import { createSolidLdoDataset } from "@ldo/connected-solid";
 *
 * const connectedSolidDataset = createSolidLdoDataset();
 * ```
 */
export function createSolidLdoDataset() {
  const solidLdoDataset = new ConnectedLdoDataset(
    [solidConnectedPlugin],
    createDatasetFactory(),
    createTransactionDatasetFactory(),
  );
  return solidLdoDataset;
}
