import { guaranteeFetch } from "../../util/guaranteeFetch.js";
import { UnexpectedResourceError } from "@ldo/connected";
import { HttpErrorResult } from "../results/error/HttpErrorResult.js";
import type {
  LeafCreateAndOverwriteResult,
  LeafCreateIfAbsentResult,
} from "./createDataResource.js";
import { deleteResource } from "./deleteResource.js";
import { readResource } from "./readResource.js";
import type { DatasetRequestOptions } from "./requestOptions.js";
import type { SolidLeaf } from "../../resources/SolidLeaf.js";
import { CreateSuccess } from "../results/success/CreateSuccess.js";
import {
  addResourceRdfToContainer,
  getParentUri,
  getSlug,
} from "../../util/rdfUtils.js";

/**
 * @internal
 * Uploads a binary resource at the provided URI
 *
 * @param uri - The URI of the resource
 * @param overwrite - If true, the request will overwrite any previous resource
 * at this URI.
 * @param options - Options to provide a fetch function and a local dataset to
 * update.
 * @returns One of many create results depending on the input
 */
export function uploadResource(
  resource: SolidLeaf,
  blob: Blob,
  mimeType: string,
  overwrite: true,
  options?: DatasetRequestOptions,
): Promise<LeafCreateAndOverwriteResult>;
export function uploadResource(
  resource: SolidLeaf,
  blob: Blob,
  mimeType: string,
  overwrite?: false,
  options?: DatasetRequestOptions,
): Promise<LeafCreateIfAbsentResult>;
export async function uploadResource(
  resource: SolidLeaf,
  blob: Blob,
  mimeType: string,
  overwrite?: boolean,
  options?: DatasetRequestOptions,
): Promise<LeafCreateIfAbsentResult | LeafCreateAndOverwriteResult> {
  try {
    const fetch = guaranteeFetch(options?.fetch);
    let didOverwrite = false;
    if (overwrite) {
      const deleteResult = await deleteResource(resource, options);
      // Return if it wasn't deleted
      if (deleteResult.isError) return deleteResult;
      didOverwrite = deleteResult.resourceExisted;
    } else {
      // Perform a read to check if it exists
      const readResult = await readResource(resource, options);
      // If it does exist stop and return.
      if (readResult.type !== "absentReadSuccess") {
        return readResult;
      }
    }
    // Create the document
    const parentUri = getParentUri(resource.uri)!;
    const response = await fetch(parentUri, {
      method: "post",
      headers: {
        "content-type": mimeType,
        slug: getSlug(resource.uri),
      },
      body: blob,
    });

    const httpError = HttpErrorResult.checkResponse(resource, response);
    if (httpError) return httpError;

    if (options?.dataset) {
      addResourceRdfToContainer(resource.uri, options.dataset);
    }
    return new CreateSuccess(resource, didOverwrite);
  } catch (err) {
    const thing = UnexpectedResourceError.fromThrown(resource, err);
    return thing;
  }
}
