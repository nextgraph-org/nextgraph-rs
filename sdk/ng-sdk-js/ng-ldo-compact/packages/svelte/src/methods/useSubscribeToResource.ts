import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";

/**
 * @internal
 *
 * Creates a useSubscribeToResource function.
 */
export function createUseSubscribeToResource<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
) {
  /**
   * Starts a subscription to a resource.
   */
  return function useSubscribeToResource(...uris: string[]): void {
    throw new Error("Subscribe to Resource is Not Implemented for Svelte");
  };
}
