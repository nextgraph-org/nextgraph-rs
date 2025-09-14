import type { BasicRequestOptions } from "./requestOptions.js";
import * as httpLinkHeader from "http-link-header";
import { CheckRootContainerSuccess } from "../results/success/CheckRootContainerSuccess.js";
import type {
  HttpErrorResultType,
  UnexpectedHttpError,
} from "../results/error/HttpErrorResult.js";
import { HttpErrorResult } from "../results/error/HttpErrorResult.js";
import { UnexpectedResourceError } from "@ldo/connected";
import type { SolidContainer } from "../../resources/SolidContainer.js";
import { guaranteeFetch } from "../../util/guaranteeFetch.js";

const parseLinkHeader: (typeof httpLinkHeader)["default"]["parse"] =
  httpLinkHeader.default.parse;

/**
 * checkRootContainer result
 */
export type CheckRootResult = CheckRootContainerSuccess | CheckRootResultError;

/**
 * All possible errors checkRootResult can return
 */
export type CheckRootResultError =
  | HttpErrorResultType<SolidContainer>
  | UnexpectedHttpError<SolidContainer>
  | UnexpectedResourceError<SolidContainer>;

/**
 * @internal
 * Checks provided headers to see if a given URI is a root container as defined
 * in the [solid specification section 4.1](https://solidproject.org/TR/protocol#storage-resource)
 *
 * @param uri - the URI of the container resource
 * @param headers - headers returned when making a GET request to the resource
 * @returns CheckRootContainerSuccess if there is not error
 */
export function checkHeadersForRootContainer(
  resource: SolidContainer,
  headers: Headers,
): CheckRootContainerSuccess {
  const linkHeader = headers.get("link");
  if (!linkHeader) {
    return new CheckRootContainerSuccess(resource, false);
  }
  const parsedLinkHeader = parseLinkHeader(linkHeader);
  const types = parsedLinkHeader.get("rel", "type");
  const isRootContainer = types.some(
    (type) => type.uri === "http://www.w3.org/ns/pim/space#Storage",
  );
  return new CheckRootContainerSuccess(resource, isRootContainer);
}

/**
 * @internal
 *
 * Performs a request to the Pod to check if the given URI is a root container
 * as defined in the [solid specification section 4.1](https://solidproject.org/TR/protocol#storage-resource)
 *
 * @param resource - the the container resource
 * @param options - options variable to pass a fetch function
 * @returns CheckResourceSuccess if there is no error
 */
export async function checkRootContainer(
  resource: SolidContainer,
  options?: BasicRequestOptions,
): Promise<CheckRootResult> {
  try {
    const fetch = guaranteeFetch(options?.fetch);
    // Fetch options to determine the document type
    // Note cache: "no-store": we don't want to depend on cached results because
    // web browsers do not cache link headers
    // https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1959
    const response = await fetch(resource.uri, {
      method: "HEAD",
      cache: "no-store",
    });
    const httpErrorResult = HttpErrorResult.checkResponse(resource, response);
    if (httpErrorResult) return httpErrorResult;

    return checkHeadersForRootContainer(resource, response.headers);
  } catch (err) {
    return UnexpectedResourceError.fromThrown(resource, err);
  }
}
