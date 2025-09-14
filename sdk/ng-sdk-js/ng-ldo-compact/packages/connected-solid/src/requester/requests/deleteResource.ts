import { namedNode } from "@ldo/rdf-utils";
import { guaranteeFetch } from "../../util/guaranteeFetch.js";
import { deleteResourceRdfFromContainer } from "../../util/rdfUtils.js";
import type { Resource } from "@ldo/connected";
import { UnexpectedResourceError } from "@ldo/connected";
import type { HttpErrorResultType } from "../results/error/HttpErrorResult.js";
import { UnexpectedHttpError } from "../results/error/HttpErrorResult.js";
import { HttpErrorResult } from "../results/error/HttpErrorResult.js";
import { DeleteSuccess } from "../results/success/DeleteSuccess.js";
import type { DatasetRequestOptions } from "./requestOptions.js";
import type { IBulkEditableDataset } from "@ldo/subscribable-dataset";
import type { Quad } from "@rdfjs/types";
import type { SolidContainer } from "../../resources/SolidContainer.js";
import type { SolidLeaf } from "../../resources/SolidLeaf.js";

/**
 * All possible return values for deleteResource
 */
export type DeleteResult<ResourceType extends Resource> =
  | DeleteSuccess<ResourceType>
  | DeleteResultError<ResourceType>;

/**
 * All possible errors that can be returned by deleteResource
 */
export type DeleteResultError<ResourceType extends Resource> =
  | HttpErrorResultType<ResourceType>
  | UnexpectedResourceError<ResourceType>;

/**
 * @internal
 * Deletes a resource on a Pod at a given URL.
 *
 * @param uri - The URI for the resource that should be deleted
 * @param options - Options to provide a fetch function and a local dataset to
 * update.
 * @returns a DeleteResult
 */
export async function deleteResource(
  resource: SolidContainer,
  options?: DatasetRequestOptions,
): Promise<DeleteResult<SolidContainer>>;
export async function deleteResource(
  resource: SolidLeaf,
  options?: DatasetRequestOptions,
): Promise<DeleteResult<SolidLeaf>>;
export async function deleteResource(
  resource: SolidContainer | SolidLeaf,
  options?: DatasetRequestOptions,
): Promise<DeleteResult<SolidContainer | SolidLeaf>>;
export async function deleteResource(
  resource: SolidContainer | SolidLeaf,
  options?: DatasetRequestOptions,
): Promise<DeleteResult<SolidContainer | SolidLeaf>> {
  try {
    const fetch = guaranteeFetch(options?.fetch);
    const response = await fetch(resource.uri, {
      method: "delete",
    });
    const errorResult = HttpErrorResult.checkResponse(resource, response);
    if (errorResult) return errorResult;

    // Specifically check for a 205. Annoyingly, the server will return 200 even
    // if it hasn't been deleted when you're unauthenticated. 404 happens when
    // the document never existed
    if (response.status === 205 || response.status === 404) {
      if (options?.dataset)
        updateDatasetOnSuccessfulDelete(resource.uri, options.dataset);
      return new DeleteSuccess(resource, response.status === 205);
    }
    return new UnexpectedHttpError(resource, response);
  } catch (err) {
    return UnexpectedResourceError.fromThrown(resource, err);
  }
}

/**
 * Assuming a successful delete has just been performed, this function updates
 * datastores to reflect that.
 *
 * @param uri - The uri of the resouce that was removed
 * @param dataset - The dataset that should be updated
 */
export function updateDatasetOnSuccessfulDelete(
  uri: string,
  dataset: IBulkEditableDataset<Quad>,
): void {
  dataset.deleteMatches(undefined, undefined, undefined, namedNode(uri));
  deleteResourceRdfFromContainer(uri, dataset);
}
