import type { Resource } from "@ldo/connected";
import { ResourceError } from "@ldo/connected";

/**
 * A set of standard errors that can be returned as a result of an HTTP request
 */
export type HttpErrorResultType<ResourceType extends Resource> =
  | ServerHttpError<ResourceType>
  | UnexpectedHttpError<ResourceType>
  | UnauthenticatedHttpError<ResourceType>
  | UnauthorizedHttpError<ResourceType>;

/**
 * An error caused by an HTTP request
 */
export abstract class HttpErrorResult<
  ResourceType extends Resource,
> extends ResourceError<ResourceType> {
  /**
   * The status of the HTTP request
   */
  public readonly status: number;

  /**
   * Headers returned by the HTTP request
   */
  public readonly headers: Headers;

  /**
   * Response returned by the HTTP request
   */
  public readonly response: Response;

  /**
   * @param resource - the resource
   * @param response - The response returned by the HTTP requests
   * @param message - A custom message for the error
   */
  constructor(resource: ResourceType, response: Response, message?: string) {
    super(
      resource,
      message ||
        `Request for ${resource.uri} returned ${response.status} (${response.statusText}).`,
    );
    this.status = response.status;
    this.headers = response.headers;
    this.response = response;
  }

  /**
   * Checks to see if a given response does not constitute an HTTP Error
   * @param response - The response of the request
   * @returns true if the response does not constitute an HTTP Error
   */
  static isnt(response: Response) {
    return (
      !(response.status >= 200 && response.status < 300) &&
      response.status !== 404 &&
      response.status !== 304
    );
  }

  /**
   * Checks a given response to see if it is a ServerHttpError, an
   * UnauthenticatedHttpError or a some unexpected error.
   * @param uri - The uri of the request
   * @param response - The response of the request
   * @returns An error if the response calls for it. Undefined if not.
   */
  static checkResponse<ResourceType extends Resource>(
    resource: ResourceType,
    response: Response,
  ): HttpErrorResultType<ResourceType> | undefined {
    if (ServerHttpError.is(response)) {
      return new ServerHttpError(resource, response);
    }
    if (UnauthenticatedHttpError.is(response)) {
      return new UnauthenticatedHttpError(resource, response);
    }
    if (UnauthorizedHttpError.is(response)) {
      return new UnauthorizedHttpError(resource, response);
    }
    if (HttpErrorResult.isnt(response)) {
      return new UnexpectedHttpError(resource, response);
    }
    return undefined;
  }
}

/**
 * An unexpected error as a result of an HTTP request. This is usually returned
 * when the HTTP request returns a status code LDO does not recognize.
 */
export class UnexpectedHttpError<
  ResourceType extends Resource,
> extends HttpErrorResult<ResourceType> {
  readonly type = "unexpectedHttpError" as const;
}

/**
 * An UnauthenticatedHttpError triggers when a Solid server returns a 401 status
 * indicating that the request is not authenticated.
 */
export class UnauthenticatedHttpError<
  ResourceType extends Resource,
> extends HttpErrorResult<ResourceType> {
  readonly type = "unauthenticatedError" as const;

  /**
   * Indicates if a specific response constitutes an UnauthenticatedHttpError
   * @param response - The request response
   * @returns true if this response constitutes an UnauthenticatedHttpError
   */
  static is(response: Response) {
    return response.status === 401;
  }
}

/**
 * An UnauthenticatedHttpError triggers when a Solid server returns a 403 status
 * indicating that the request is not authorized.
 */
export class UnauthorizedHttpError<
  ResourceType extends Resource,
> extends HttpErrorResult<ResourceType> {
  readonly type = "unauthorizedError" as const;

  /**
   * Indicates if a specific response constitutes an UnauthenticatedHttpError
   * @param response - The request response
   * @returns true if this response constitutes an UnauthenticatedHttpError
   */
  static is(response: Response) {
    return response.status === 403;
  }
}

/**
 * An NotFoundHttpError triggers when a Solid server returns a 404 status. This
 * error is not returned in most cases as a "absent" resource is not considered
 * an error, but it is thrown while trying for find a WAC rule for a resource
 * that does not exist.
 */
export class NotFoundHttpError<
  ResourceType extends Resource,
> extends HttpErrorResult<ResourceType> {
  readonly type = "notFoundError" as const;

  /**
   * Indicates if a specific response constitutes an NotFoundHttpError
   * @param response - The request response
   * @returns true if this response constitutes an NotFoundHttpError
   */
  static is(response: Response) {
    return response.status === 404;
  }
}

/**
 * A ServerHttpError triggers when a Solid server returns a 5XX status,
 * indicating that an error happened on the server.
 */
export class ServerHttpError<
  ResourceType extends Resource,
> extends HttpErrorResult<ResourceType> {
  readonly type = "serverError" as const;

  /**
   * Indicates if a specific response constitutes a ServerHttpError
   * @param response - The request response
   * @returns true if this response constitutes a ServerHttpError
   */
  static is(response: Response) {
    return response.status >= 500 && response.status < 600;
  }
}
