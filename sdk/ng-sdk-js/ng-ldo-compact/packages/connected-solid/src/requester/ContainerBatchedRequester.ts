import type { ConnectedContext } from "@ldo/connected";
import type { SolidContainer } from "../resources/SolidContainer.js";
import { BatchedRequester } from "./BatchedRequester.js";
import type { CheckRootResult } from "./requests/checkRootContainer.js";
import { checkRootContainer } from "./requests/checkRootContainer.js";
import type {
  ContainerCreateAndOverwriteResult,
  ContainerCreateIfAbsentResult,
} from "./requests/createDataResource.js";
import type { ReadContainerResult } from "./requests/readResource.js";
import { modifyQueueByMergingEventsWithTheSameKeys } from "./util/modifyQueueFuntions.js";
import type { SolidConnectedPlugin } from "../SolidConnectedPlugin.js";

export const IS_ROOT_CONTAINER_KEY = "isRootContainer";

/**
 * @internal
 *
 * A singleton to handle batched requests for containers
 */
export class ContainerBatchedRequester extends BatchedRequester<SolidContainer> {
  /**
   * The URI of the container
   */
  readonly resource: SolidContainer;

  /**
   * @param uri - The URI of the container
   * @param context - ConnectedContext of the parent dataset
   */
  constructor(
    resource: SolidContainer,
    context: ConnectedContext<SolidConnectedPlugin[]>,
  ) {
    super(context);
    this.resource = resource;
  }

  /**
   * Reads the container
   * @returns A ReadContainerResult
   */
  read(): Promise<ReadContainerResult> {
    return super.read() as Promise<ReadContainerResult>;
  }

  /**
   * Creates the container
   * @param overwrite - If true, this will orverwrite the resource if it already
   * exists
   */
  createDataResource(
    overwrite: true,
  ): Promise<ContainerCreateAndOverwriteResult>;
  createDataResource(overwrite?: false): Promise<ContainerCreateIfAbsentResult>;
  createDataResource(
    overwrite?: boolean,
  ): Promise<ContainerCreateIfAbsentResult | ContainerCreateAndOverwriteResult>;
  createDataResource(
    overwrite?: boolean,
  ): Promise<
    ContainerCreateIfAbsentResult | ContainerCreateAndOverwriteResult
  > {
    return super.createDataResource(overwrite) as Promise<
      ContainerCreateIfAbsentResult | ContainerCreateAndOverwriteResult
    >;
  }

  /**
   * Checks to see if this container is a root container
   * @returns A CheckRootResult
   */
  async isRootContainer(): Promise<CheckRootResult> {
    return this.requestBatcher.queueProcess({
      name: IS_ROOT_CONTAINER_KEY,
      args: [this.resource, { fetch: this.context.solid.fetch }],
      perform: checkRootContainer,
      modifyQueue: modifyQueueByMergingEventsWithTheSameKeys(
        IS_ROOT_CONTAINER_KEY,
      ),
    });
  }
}
