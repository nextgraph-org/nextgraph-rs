import type { Resource } from "../../Resource.js";
import { ResourceSuccess } from "./SuccessResult.js";

/**
 * Indicates that a specific resource is unfetched
 */
export class Unfetched<
  ResourceType extends Resource,
> extends ResourceSuccess<ResourceType> {
  readonly type = "unfetched" as const;
}
