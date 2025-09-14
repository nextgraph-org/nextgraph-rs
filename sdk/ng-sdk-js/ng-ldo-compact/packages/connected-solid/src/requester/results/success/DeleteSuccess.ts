import type { Resource } from "@ldo/connected";
import { ResourceSuccess } from "@ldo/connected";

/**
 * Indicates that the request to delete a resource was a success.
 */
export class DeleteSuccess<
  ResourceType extends Resource,
> extends ResourceSuccess<ResourceType> {
  type = "deleteSuccess" as const;

  /**
   * True if there was a resource at the provided URI that was deleted. False if
   * a resource didn't exist.
   */
  resourceExisted: boolean;

  constructor(resource: ResourceType, resourceExisted: boolean) {
    super(resource);
    this.resourceExisted = resourceExisted;
  }
}
