/* istanbul ignore file */
import type { Resource } from "@ldo/connected";
import { ResourceError } from "@ldo/connected";

/**
 * An error: Could not fetch access rules
 */
export class AccessRuleFetchError<
  ResourceType extends Resource,
> extends ResourceError<ResourceType> {
  readonly type = "accessRuleFetchError" as const;

  /**
   * @param resource - The resource for which access rules couldn't be
   * fetched
   * @param message - A custom message for the error
   */
  constructor(resource: ResourceType, message?: string) {
    super(
      resource,
      message ?? `${resource.uri} had trouble fetching access rules.`,
    );
  }
}
