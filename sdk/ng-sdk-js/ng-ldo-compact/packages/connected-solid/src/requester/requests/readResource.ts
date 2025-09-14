import type { UnexpectedHttpError } from "../results/error/HttpErrorResult.js";
import {
  HttpErrorResult,
  type HttpErrorResultType,
} from "../results/error/HttpErrorResult.js";
import type { DatasetRequestOptions } from "./requestOptions.js";
import {
  BinaryReadSuccess,
  DataReadSuccess,
} from "../results/success/SolidReadSuccess.js";
import { ContainerReadSuccess } from "../results/success/SolidReadSuccess.js";
import { NoncompliantPodError } from "../results/error/NoncompliantPodError.js";
import { guaranteeFetch } from "../../util/guaranteeFetch.js";
import type { Resource } from "@ldo/connected";
import { UnexpectedResourceError, AbsentReadSuccess } from "@ldo/connected";
import { checkHeadersForRootContainer } from "./checkRootContainer.js";
import { namedNode } from "@ldo/rdf-utils";
import type { SolidLeaf } from "../../resources/SolidLeaf.js";
import type { SolidContainer } from "../../resources/SolidContainer.js";
import {
  addRawTurtleToDataset,
  addResourceRdfToContainer,
} from "../../util/rdfUtils.js";

/**
 * All possible return values for reading a leaf
 */
export type ReadLeafResult =
  | BinaryReadSuccess
  | DataReadSuccess
  | AbsentReadSuccess<SolidLeaf>
  | ReadResultError<SolidLeaf>;

/**
 * All possible return values for reading a container
 */
export type ReadContainerResult =
  | ContainerReadSuccess
  | AbsentReadSuccess<SolidContainer>
  | ReadResultError<SolidContainer>;

/**
 * All possible errors the readResource function can return
 */
export type ReadResultError<ResourceType extends Resource> =
  | HttpErrorResultType<ResourceType>
  | NoncompliantPodError<ResourceType>
  | UnexpectedHttpError<ResourceType>
  | UnexpectedResourceError<ResourceType>;

/**
 * @internal
 * Reads resource at a provided URI and returns the result
 *
 * @param uri - The URI of the resource
 * @param options - Options to provide a fetch function and a local dataset to
 * update.
 * @returns ReadResult
 */
export async function readResource(
  resource: SolidLeaf,
  options?: DatasetRequestOptions,
): Promise<ReadLeafResult>;
export async function readResource(
  resource: SolidContainer,
  options?: DatasetRequestOptions,
): Promise<ReadContainerResult>;
export async function readResource(
  resource: SolidLeaf | SolidContainer,
  options?: DatasetRequestOptions,
): Promise<ReadLeafResult | ReadContainerResult>;
export async function readResource(
  resource: SolidLeaf | SolidContainer,
  options?: DatasetRequestOptions,
): Promise<ReadLeafResult | ReadContainerResult> {
  try {
    const fetch = guaranteeFetch(options?.fetch);
    // Fetch options to determine the document type
    const response = await fetch(resource.uri, {
      headers: { accept: "text/turtle, */*" },
    });
    if (response.status === 404) {
      // Clear existing data if present
      if (options?.dataset) {
        options.dataset.deleteMatches(
          undefined,
          undefined,
          undefined,
          namedNode(resource.uri),
        );
      }

      return new AbsentReadSuccess(resource, false) as
        | AbsentReadSuccess<SolidLeaf>
        | AbsentReadSuccess<SolidContainer>;
    }
    const httpErrorResult = HttpErrorResult.checkResponse(resource, response);
    if (httpErrorResult)
      return httpErrorResult as
        | HttpErrorResultType<SolidLeaf>
        | HttpErrorResultType<SolidContainer>;

    // Add this resource to the container
    if (options?.dataset) {
      addResourceRdfToContainer(resource.uri, options.dataset);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType) {
      return new NoncompliantPodError(
        resource,
        "Resource requests must return a content-type header.",
      ) as
        | NoncompliantPodError<SolidContainer>
        | NoncompliantPodError<SolidLeaf>;
    }

    if (contentType.startsWith("text/turtle")) {
      // Parse Turtle
      const rawTurtle = await response.text();
      if (options?.dataset) {
        const result = await addRawTurtleToDataset(
          rawTurtle,
          options.dataset,
          resource.uri,
        );
        if (result)
          return new NoncompliantPodError(resource, result.message) as
            | NoncompliantPodError<SolidLeaf>
            | NoncompliantPodError<SolidContainer>;
      }
      if (resource.type === "SolidContainer") {
        const result = checkHeadersForRootContainer(resource, response.headers);
        return new ContainerReadSuccess(
          resource,
          false,
          result.isRootContainer,
        );
      }
      return new DataReadSuccess(resource as SolidLeaf, false);
    } else {
      // Load Blob
      const blob = await response.blob();
      return new BinaryReadSuccess(
        resource as SolidLeaf,
        false,
        blob,
        contentType,
      );
    }
  } catch (err) {
    return UnexpectedResourceError.fromThrown(resource, err) as
      | UnexpectedResourceError<SolidLeaf>
      | UnexpectedResourceError<SolidContainer>;
  }
}
