import type { Resource } from "../../Resource.js";
import type { ConnectedResult } from "../ConnectedResult.js";

/**
 * Indicates that some action taken by LDO was a success
 */
export abstract class SuccessResult implements ConnectedResult {
  abstract readonly type: string;
  readonly isError = false as const;
}

/**
 * Indicates that a request to a resource was aa success
 */
export abstract class ResourceSuccess<
  ResourceType extends Resource,
> extends SuccessResult {
  /**
   * The URI of the resource
   */
  uri: ResourceType["uri"];
  /**
   * The resource that was successful
   */
  resource: ResourceType;

  constructor(resource: ResourceType) {
    super();
    this.uri = resource.uri;
    this.resource = resource;
  }
}

/**
 * A grouping of multiple successes as a result of an action
 */
export class AggregateSuccess<
  SuccessType extends SuccessResult,
> extends SuccessResult {
  type = "aggregateSuccess" as const;

  /**
   * An array of all successesses
   */
  results: SuccessType[];

  constructor(results: SuccessType[]) {
    super();
    this.results = results;
  }
}
