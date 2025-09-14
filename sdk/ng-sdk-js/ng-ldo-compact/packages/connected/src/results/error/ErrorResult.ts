import type { Resource } from "../../Resource.js";
import type { ConnectedResult } from "../ConnectedResult.js";

/**
 * A result indicating that the request failed in some kind of way
 */
export abstract class ErrorResult extends Error implements ConnectedResult {
  /**
   * Indicates the specific type of error
   */
  abstract readonly type: string;

  /**
   * Always true
   */
  readonly isError = true as const;

  /**
   * @param message - a custom message for the error
   */
  constructor(message?: string) {
    super(message || "An unkown error was encountered.");
  }
}

/**
 * An error for a specific resource
 */
export abstract class ResourceError<
  ResourceType extends Resource,
> extends ErrorResult {
  /**
   * The URI of the resource
   */
  readonly uri: ResourceType["uri"];

  /**
   * The resource that failed
   */
  readonly resource: ResourceType;

  /**
   * @param uri - The URI of the resource
   * @param message - A custom message for the error
   */
  constructor(resource: ResourceType, message?: string) {
    super(message || `An unkown error for ${resource.uri}`);
    this.uri = resource.uri;
    this.resource = resource;
  }
}

/**
 * An error that aggregates many errors
 */
export class AggregateError<ErrorType extends ErrorResult> extends ErrorResult {
  readonly type = "aggregateError" as const;

  /**
   * A list of all errors returned
   */
  readonly errors: ErrorType[];

  /**
   * @param errors - List of all errors returned
   * @param message - A custom message for the error
   */
  constructor(
    errors: (ErrorType | AggregateError<ErrorType>)[],
    message?: string,
  ) {
    const allErrors: ErrorType[] = [];
    errors.forEach((error) => {
      if (error instanceof AggregateError) {
        error.errors.forEach((subError) => {
          allErrors.push(subError);
        });
      } else {
        allErrors.push(error);
      }
    });
    super(
      message ||
        `Encountered multiple errors:${allErrors.reduce(
          (agg, cur) => `${agg}\n${cur}`,
          "",
        )}`,
    );
    this.errors = allErrors;
  }
}

/**
 * Represents some error that isn't handled under other errors. This is usually
 * returned when something threw an error that LDO did not expect.
 */
export class UnexpectedResourceError<
  ResourceType extends Resource,
> extends ResourceError<ResourceType> {
  readonly type = "unexpectedResourceError" as const;

  /**
   * The error that was thrown
   */
  error: Error;

  /**
   * @param uri - URI of the resource
   * @param error - The error that was thrown
   */
  constructor(resource: ResourceType, error: Error) {
    super(resource, error.message);
    this.error = error;
  }

  /**
   * @internal
   *
   * Creates an UnexpectedResourceError from a thrown error
   * @param uri - The URI of the resource
   * @param err - The thrown error
   * @returns an UnexpectedResourceError
   */
  static fromThrown<ResourceType extends Resource>(
    resource: ResourceType,
    err: unknown,
  ): UnexpectedResourceError<ResourceType> {
    if (err instanceof Error) {
      return new UnexpectedResourceError(resource, err);
    } else if (typeof err === "string") {
      return new UnexpectedResourceError(resource, new Error(err));
    } else {
      return new UnexpectedResourceError(
        resource,
        new Error(`Error of type ${typeof err} thrown: ${err}`),
      );
    }
  }
}
