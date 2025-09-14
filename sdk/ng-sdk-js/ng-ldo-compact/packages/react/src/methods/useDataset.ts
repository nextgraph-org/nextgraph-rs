import { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";

/**
 * @internal
 * 
 * Creates a useDataset function
 */
export function createUseDataset<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
) {
  /**
   * Returns the global dataset for the application
   */
  return function useDataset() {
    return dataset;
  }
}