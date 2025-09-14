import type { Resource } from "../../Resource.js";
import { ResourceError } from "./ErrorResult.js";

/**
 * An InvalidUriError is returned when a URI was provided that is not a valid
 * URI.
 */
export class InvalidUriError<
  ResourceType extends Resource,
> extends ResourceError<ResourceType> {
  readonly type = "invalidUriError" as const;

  constructor(resource: ResourceType, message?: string) {
    super(resource, message || `${resource.uri} is an invalid uri.`);
  }
}
