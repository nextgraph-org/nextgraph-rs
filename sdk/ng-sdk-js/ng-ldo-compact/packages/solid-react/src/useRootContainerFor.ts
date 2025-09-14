import { useEffect, useState } from "react";
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import type {
  SolidConnectedPlugin,
  SolidContainer,
  SolidContainerUri,
  SolidLeafUri,
} from "@ldo/connected-solid";
import type { UseResourceOptions, createUseResource } from "@ldo/react";

/**
 * @internal
 *
 * Creates a useRootContainerFor function
 */
export function createUseRootContainerFor(
  dataset: ConnectedLdoDataset<SolidConnectedPlugin[]>,
  useResource: ReturnType<typeof createUseResource<ConnectedPlugin[]>>,
) {
  /**
   * Gets the root container for a specific URI
   */
  return function useRootContainerFor(
    uri?: SolidContainerUri | SolidLeafUri,
    options?: UseResourceOptions<"solid">,
  ): SolidContainer | undefined {
    const [rootContainerUri, setRootContainerUri] = useState<
      SolidContainerUri | undefined
    >(undefined);

    useEffect(() => {
      if (uri) {
        const givenResource = dataset.getResource(uri);
        givenResource.getRootContainer().then((result) => {
          if (!result.isError) {
            setRootContainerUri(result.uri);
          }
        });
      } else {
        setRootContainerUri(undefined);
      }
    }, [uri]);

    return useResource(rootContainerUri, options) as SolidContainer | undefined;
  };
}
