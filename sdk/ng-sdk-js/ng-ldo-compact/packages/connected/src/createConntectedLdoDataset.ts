import { createDatasetFactory } from "@ldo/dataset";
import { ConnectedLdoDataset } from "./ConnectedLdoDataset.js";
import type { ConnectedPlugin } from "./types/ConnectedPlugin.js";
import { createTransactionDatasetFactory } from "@ldo/subscribable-dataset";

/**
 * Creates a ConnectedLdoDataset
 * @param plugins - An array of plugins for platforms to connect to
 * @returns - A ConnectedLdoDataset
 *
 * @example
 * ```typescript
 * import { createConnectedLdoDataset } from "@ldo/connected";
 *
 * // At least one plugin needs to be provided to a ConnectedLdoDataset. In this
 * // example we'll use both the Solid and NextGraph plugins.
 * import { solidConnectedPlugin } from "@ldo/connected-solid";
 * import { nextGraphConnectedPlugin } from "@ldo/connected-nextgraph";
 *
 * // ...
 *
 * const connectedLdoDataset = createConnectedLdoDataset([
 *   solidConnectedPlugin,
 *   nextGraphConnectedPlugin
 * ]);
 * ```
 */
export function createConnectedLdoDataset<Plugins extends ConnectedPlugin[]>(
  plugins: Plugins,
): ConnectedLdoDataset<Plugins> {
  return new ConnectedLdoDataset(
    plugins,
    createDatasetFactory(),
    createTransactionDatasetFactory(),
  );
}
