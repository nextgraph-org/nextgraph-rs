import type { Resource } from "../../Resource.js";
import { ResourceSuccess } from "./SuccessResult.js";

/**
 * Indicates that the request to read a resource was a success
 */
export abstract class ReadSuccess<
  ResourceType extends Resource,
> extends ResourceSuccess<ResourceType> {
  /**
   * True if the resource was recalled from local memory rather than a recent
   * request
   */
  recalledFromMemory: boolean;

  constructor(resource: ResourceType, recalledFromMemory: boolean) {
    super(resource);
    this.recalledFromMemory = recalledFromMemory;
  }
}

/**
 * Indicates that the read request was successful, but no resource exists at
 * the provided URI.
 */
export class AbsentReadSuccess<
  ResourceType extends Resource,
> extends ReadSuccess<ResourceType> {
  type = "absentReadSuccess" as const;
}
