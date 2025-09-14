import { ResourceSuccess } from "@ldo/connected";
import type { Resource } from "@ldo/connected";

/**
 * Indicates that the request to create the resource was a success.
 */
export class CreateSuccess<
  ResourceType extends Resource,
> extends ResourceSuccess<ResourceType> {
  type = "createSuccess" as const;
  /**
   * True if there was a resource that existed before at the given URI that was
   * overwritten
   */
  didOverwrite: boolean;

  constructor(resource: ResourceType, didOverwrite: boolean) {
    super(resource);
    this.didOverwrite = didOverwrite;
  }
}
