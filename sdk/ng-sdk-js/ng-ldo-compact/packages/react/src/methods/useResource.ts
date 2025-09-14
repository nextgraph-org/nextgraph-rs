import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import type {
  ConnectedLdoDataset,
  ConnectedPlugin,
  GetResourceReturnType,
  Resource,
} from "@ldo/connected";

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
  ): GetResourceReturnType<Plugin, UriType>;
  <
    Name extends Plugins[number]["name"],
    Plugin extends Extract<Plugins[number], { name: Name }>,
    UriType extends string,
  >(
    uri?: UriType,
    options?: UseResourceOptions<Name>,
  ): GetResourceReturnType<Plugin, UriType> | undefined;
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
  ): GetResourceReturnType<Plugin, UriType> | undefined {
    const subscriptionIdRef = useRef<string | undefined>();

    // Get the resource
    const resource = useMemo(() => {
      if (uri) {
        const resource = dataset.getResource(uri);
        // Run read operations if necissary
        if (!options?.suppressInitialRead) {
          if (options?.reloadOnMount) {
            resource.read();
          } else {
            resource.readIfUnfetched();
          }
        }
        return resource;
      }
      return undefined;
    }, [uri]);
    const [resourceRepresentation, setResourceRepresentation] =
      useState(resource);
    const pastResource = useRef<
      { resource?: Resource; callback: () => void } | undefined
    >();

    useEffect(() => {
      if (options?.subscribe) {
        resource
          ?.subscribeToNotifications()
          .then(
            (subscriptionId) => (subscriptionIdRef.current = subscriptionId),
          );
      } else if (subscriptionIdRef.current) {
        resource?.unsubscribeFromNotifications(subscriptionIdRef.current);
      }
      return () => {
        if (subscriptionIdRef.current)
          resource?.unsubscribeFromNotifications(subscriptionIdRef.current);
      };
    }, [resource, options?.subscribe]);

    // Callback function to force the react dom to reload.
    const forceReload = useCallback(
      // Wrap the resource in a proxy so it's techically a different object
      () => {
        if (resource) setResourceRepresentation(new Proxy(resource, {}));
      },
      [resource],
    );

    useEffect(() => {
      // Remove listeners for the previous resource
      if (pastResource.current?.resource) {
        pastResource.current.resource.off(
          "update",
          pastResource.current.callback,
        );
      }
      // Set a new past resource to the current resource
      pastResource.current = { resource, callback: forceReload };
      if (resource) {
        // Add listener
        resource.on("update", forceReload);
        setResourceRepresentation(new Proxy(resource, {}));

        // Unsubscribe on unmount
        return () => {
          resource.off("update", forceReload);
        };
      } else {
        setResourceRepresentation(undefined);
      }
    }, [resource]);
    return resourceRepresentation as
      | GetResourceReturnType<Plugin, UriType>
      | undefined;
  };
}
