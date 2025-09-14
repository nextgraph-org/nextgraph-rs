import type { Resource } from "../../Resource.js";
import { ResourceSuccess, SuccessResult } from "./SuccessResult.js";

/**
 * Indicates that an update request to a resource was successful
 */
export class UpdateSuccess<
  ResourceType extends Resource,
> extends ResourceSuccess<ResourceType> {
  type = "updateSuccess" as const;
}

/**
 * Indicates that an update request to the default graph was successful. This
 * data was not written to a Pod. It was only written locally.
 */
export class UpdateDefaultGraphSuccess extends SuccessResult {
  type = "updateDefaultGraphSuccess" as const;
}

/**
 * Indicates that LDO ignored an invalid update (usually because a container
 * attempted an update)
 */
export class IgnoredInvalidUpdateSuccess<
  ResourceType extends Resource,
> extends ResourceSuccess<ResourceType> {
  type = "ignoredInvalidUpdateSuccess" as const;
}
