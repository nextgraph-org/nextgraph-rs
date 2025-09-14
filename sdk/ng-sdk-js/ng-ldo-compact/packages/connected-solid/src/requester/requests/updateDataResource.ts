import type { DatasetChanges } from "@ldo/rdf-utils";
import { changesToSparqlUpdate } from "@ldo/rdf-utils";
import type { Quad } from "@rdfjs/types";
import { guaranteeFetch } from "../../util/guaranteeFetch.js";
import type { Resource } from "@ldo/connected";
import { UnexpectedResourceError, UpdateSuccess } from "@ldo/connected";
import type { HttpErrorResultType } from "../results/error/HttpErrorResult.js";
import { HttpErrorResult } from "../results/error/HttpErrorResult.js";
import type { DatasetRequestOptions } from "./requestOptions.js";
import type { SolidContainer } from "../../resources/SolidContainer.js";
import type { SolidLeaf } from "../../resources/SolidLeaf.js";

/**
 * All return values for updateDataResource
 */
export type UpdateResult<ResourceType extends Resource> =
  | UpdateSuccess<ResourceType>
  | UpdateResultError<ResourceType>;

/**
 * All errors updateDataResource can return
 */
export type UpdateResultError<ResourceType extends Resource> =
  | HttpErrorResultType<ResourceType>
  | UnexpectedResourceError<ResourceType>;

/**
 * @internal
 * Updates a specific data resource with the provided dataset changes
 *
 * @param uri - the URI of the data resource
 * @param datasetChanges - A set of triples added and removed from this dataset
 * @param options - Options to provide a fetch function and a local dataset to
 * update.
 * @returns An UpdateResult
 */
export async function updateDataResource(
  resource: SolidLeaf,
  datasetChanges: DatasetChanges<Quad>,
  options?: DatasetRequestOptions,
): Promise<UpdateResult<SolidLeaf>>;
export async function updateDataResource(
  resource: SolidContainer,
  datasetChanges: DatasetChanges<Quad>,
  options?: DatasetRequestOptions,
): Promise<UpdateResult<SolidContainer>>;
export async function updateDataResource(
  resource: SolidLeaf | SolidContainer,
  datasetChanges: DatasetChanges<Quad>,
  options?: DatasetRequestOptions,
): Promise<UpdateResult<SolidLeaf | SolidContainer>>;
export async function updateDataResource(
  resource: SolidLeaf | SolidContainer,
  datasetChanges: DatasetChanges<Quad>,
  options?: DatasetRequestOptions,
): Promise<UpdateResult<SolidLeaf | SolidContainer>> {
  try {
    // Optimistically add data
    options?.dataset?.bulk(datasetChanges);
    const fetch = guaranteeFetch(options?.fetch);

    // Make request
    const sparqlUpdate = await changesToSparqlUpdate(datasetChanges);
    const response = await fetch(resource.uri, {
      method: "PATCH",
      body: sparqlUpdate,
      headers: {
        "Content-Type": "application/sparql-update",
      },
    });
    const httpError = HttpErrorResult.checkResponse(resource, response);
    if (httpError) {
      // Handle error rollback
      if (options?.dataset) {
        options.dataset.bulk({
          added: datasetChanges.removed,
          removed: datasetChanges.added,
        });
      }
      return httpError;
    }
    return new UpdateSuccess(resource);
  } catch (err) {
    return UnexpectedResourceError.fromThrown(resource, err);
  }
}
