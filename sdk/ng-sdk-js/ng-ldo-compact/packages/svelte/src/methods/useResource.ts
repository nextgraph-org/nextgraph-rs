import type {
  ConnectedLdoDataset,
  ConnectedPlugin,
  GetResourceReturnType,
} from "@ldo/connected";
import { writable, type Readable } from "svelte/store";

export interface UseResourceOptions<Name> {
  pluginName?: Name;
  suppressInitialRead?: boolean;
  reloadOnMount?: boolean;
  subscribe?: boolean;
}

export type useResourceType<Plugins extends ConnectedPlugin[]> = {
  <
    Name extends Plugins[number]["name"],
    Plugin extends Extract<Plugins[number], { name: Name }>,
    UriType extends string,
  >(
    uri: UriType,
    options?: UseResourceOptions<Name>,
  ): Readable<GetResourceReturnType<Plugin, UriType>>;
  <
    Name extends Plugins[number]["name"],
    Plugin extends Extract<Plugins[number], { name: Name }>,
    UriType extends string,
  >(
    uri?: UriType,
    options?: UseResourceOptions<Name>,
  ): Readable<GetResourceReturnType<Plugin, UriType> | undefined>;
};

/**
 * @internal
 *
 * Creates a useResource function.
 */
export function createUseResource<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
): useResourceType<Plugins> {
  /**
   * Returns a resource and triggers a rerender if that resource is updated.
   */
  return function useResource<
    Name extends Plugins[number]["name"],
    Plugin extends Extract<Plugins[number], { name: Name }>,
    UriType extends string,
  >(
    uri?: UriType,
    options?: UseResourceOptions<Name>,
  ): Readable<GetResourceReturnType<Plugin, UriType> | undefined> {
    let resource: GetResourceReturnType<Plugin, UriType> | undefined;
    // Get the resource based on incoming data
    if (uri) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resource = dataset.getResource(uri) as any;
      // Run read operations if necissary
      if (!options?.suppressInitialRead) {
        if (options?.reloadOnMount) {
          resource!.read();
        } else {
          resource!.readIfUnfetched();
        }
      }
    } else {
      resource = undefined;
    }

    // The Svelte store
    const store = writable<GetResourceReturnType<Plugin, UriType> | undefined>(
      resource,
      (set) => {
        const onResourceUpdate = () => {
          set(resource);
        };

        if (resource) {
          resource.on("update", onResourceUpdate);

          // TODO: handle subscriptions

          return () => {
            resource.off("update", onResourceUpdate);
          };
        }
      },
    );

    return {
      subscribe: store.subscribe,
    };
  };
}
