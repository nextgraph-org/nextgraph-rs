/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import type { SolidContainerUri, SolidLeafUri } from "./types.js";
import { GetStorageContainerFromWebIdSuccess } from "./requester/results/success/CheckRootContainerSuccess.js";
import type { CheckRootResultError } from "./requester/requests/checkRootContainer.js";
import type { ReadResultError } from "./requester/requests/readResource.js";
import type { NoRootContainerError } from "./requester/results/error/NoRootContainerError.js";
import type { SolidLeaf } from "./resources/SolidLeaf.js";
import type { SolidContainer } from "./resources/SolidContainer.js";
import type { SolidConnectedPlugin } from "./SolidConnectedPlugin.js";
import { ProfileWithStorageShapeType } from "./.ldo/solid.shapeTypes.js";

/**
 * Gets a list of root storage containers for a user given their WebId
 * @param webId: The webId for the user
 * @returns A list of storages if successful, an error if not
 * @example
 * ```typescript
 * import { getStorageFromWebId } from "@ldo/connected-solid";
 *
 * const result = await getStorageFromWebId(
 *   solidLdoDataset,
 *   "https://example.com/profile/card#me"
 * );
 * if (result.isError) {
 *   // Do something
 * }
 * console.log(result.storageContainer[0].uri);
 * ```
 */
export async function getStorageFromWebId(
  webId: SolidLeafUri,
  dataset: ConnectedLdoDataset<(SolidConnectedPlugin | ConnectedPlugin)[]>,
): Promise<
  | GetStorageContainerFromWebIdSuccess
  | CheckRootResultError
  | ReadResultError<SolidLeaf | SolidContainer>
  | NoRootContainerError<SolidContainer>
> {
  const webIdResource = dataset.getResource(webId) as SolidLeaf;
  const readResult = await webIdResource.readIfUnfetched();
  if (readResult.isError) return readResult;
  const profile = dataset
    .usingType(ProfileWithStorageShapeType)
    .fromSubject(webId);
  if (profile.storage && profile.storage.size > 0) {
    const containers = profile.storage
      .map((storageNode) =>
        dataset.getResource(storageNode["@id"] as SolidContainerUri),
      )
      .filter((container): container is SolidContainer => {
        return container.type === "SolidContainer";
      });

    return new GetStorageContainerFromWebIdSuccess(containers);
  }
  const getContainerResult = await webIdResource.getRootContainer();
  if (getContainerResult.type === "SolidContainer")
    return new GetStorageContainerFromWebIdSuccess([getContainerResult]);
  return getContainerResult;
}
