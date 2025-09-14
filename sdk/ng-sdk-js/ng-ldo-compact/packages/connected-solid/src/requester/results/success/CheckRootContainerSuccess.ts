import type { SolidContainer } from "../../../resources/SolidContainer.js";
import { ResourceSuccess, SuccessResult } from "@ldo/connected";

/**
 * Indicates that the request to check if a resource is the root container was
 * a success.
 */
export class CheckRootContainerSuccess extends ResourceSuccess<SolidContainer> {
  type = "checkRootContainerSuccess" as const;
  /**
   * True if this resoure is the root container
   */
  isRootContainer: boolean;

  constructor(resource: SolidContainer, isRootContainer: boolean) {
    super(resource);
    this.isRootContainer = isRootContainer;
  }
}

/**
 * Indicates that the storage container has been successfully retireved from the
 * webId. Call `GetStorageContainerFromWebIdSuccess.storageContainers` for a
 * list of storage containers retrieved.
 */
export class GetStorageContainerFromWebIdSuccess extends SuccessResult {
  type = "getStorageContainerFromWebIdSuccess" as const;

  /**
   * The storage containers retrieved
   */
  storageContainers: SolidContainer[];

  constructor(storageContainers: SolidContainer[]) {
    super();
    this.storageContainers = storageContainers;
  }
}
