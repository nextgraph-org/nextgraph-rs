import type { Resource } from "@ldo/connected";
import { ResourceError } from "@ldo/connected";

/**
 * A NoncompliantPodError is returned when the server responded in a way that is
 * not compliant with the Solid specification.
 */
export class NoncompliantPodError<
  ResourceType extends Resource,
> extends ResourceError<ResourceType> {
  readonly type = "noncompliantPodError" as const;

  /**
   * @param resource - the requested resource
   * @param message - a custom message for the error
   */
  constructor(resource: ResourceType, message?: string) {
    super(
      resource,
      `Response from ${resource.uri} is not compliant with the Solid Specification: ${message}`,
    );
  }
}
