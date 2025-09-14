import { namedNode } from "@ldo/rdf-utils";
import { ContainerBatchedRequester } from "../requester/ContainerBatchedRequester.js";
import type {
  CheckRootResult,
  CheckRootResultError,
} from "../requester/requests/checkRootContainer.js";
import type {
  ContainerCreateAndOverwriteResult,
  ContainerCreateIfAbsentResult,
  LeafCreateAndOverwriteResult,
  LeafCreateIfAbsentResult,
} from "../requester/requests/createDataResource.js";
import type {
  DeleteResult,
  DeleteResultError,
} from "../requester/requests/deleteResource.js";
import type {
  ReadContainerResult,
  ReadResultError,
} from "../requester/requests/readResource.js";
import type { DeleteSuccess } from "../requester/results/success/DeleteSuccess.js";
import type { ContainerReadSuccess } from "../requester/results/success/SolidReadSuccess.js";
import { getParentUri, ldpContains } from "../util/rdfUtils.js";
import { NoRootContainerError } from "../requester/results/error/NoRootContainerError.js";
import type { SharedStatuses } from "./SolidResource.js";
import { SolidResource } from "./SolidResource.js";
import type {
  SolidContainerSlug,
  SolidContainerUri,
  SolidLeafSlug,
} from "../types.js";
import type { ReadSuccess } from "@ldo/connected";
import { AggregateSuccess, IgnoredInvalidUpdateSuccess } from "@ldo/connected";
import {
  Unfetched,
  type ConnectedContext,
  AggregateError,
} from "@ldo/connected";
import type { SolidConnectedPlugin } from "../SolidConnectedPlugin.js";
import type { SolidLeaf } from "./SolidLeaf.js";
import type { HttpErrorResultType } from "../requester/results/error/HttpErrorResult.js";
import type { DatasetChanges } from "@ldo/rdf-utils";

/**
 * Represents the current status of a specific container on a Pod as known by
 * LDO.
 *
 * @example
 * ```typescript
 * const container = solidLdoDataset
 *   .getResource("https://example.com/container/");
 * ```
 */
export class SolidContainer extends SolidResource {
  /**
   * The URI of the container
   */
  readonly uri: SolidContainerUri;

  /**
   * @internal
   * Batched Requester for the Container
   */
  protected requester: ContainerBatchedRequester;

  /**
   * @internal
   * True if this is the root container, false if not, undefined if unknown
   */
  protected rootContainer: boolean | undefined;

  /**
   * Indicates that this resource is a container resource
   */
  readonly type = "SolidContainer" as const;

  /**
   * Indicates that this resource is not an error
   */
  readonly isError = false as const;

  /**
   * The status of the last request made for this container
   */
  status:
    | SharedStatuses<this>
    | ReadContainerResult
    | ContainerCreateAndOverwriteResult
    | ContainerCreateIfAbsentResult
    | CheckRootResult;

  /**
   * @param uri - The uri of the container
   * @param context - SolidLdoDatasetContext for the parent dataset
   */
  constructor(
    uri: SolidContainerUri,
    context: ConnectedContext<SolidConnectedPlugin[]>,
  ) {
    super(context);
    this.uri = uri;
    this.requester = new ContainerBatchedRequester(this, context);
    this.status = new Unfetched(this);
  }

  /**
   * Checks if this container is a root container
   * @returns true if this container is a root container, false if not, and
   * undefined if this is unknown at the moment.
   *
   * @example
   * ```typescript
   * // Returns "undefined" when the container is unfetched
   * console.log(container.isRootContainer());
   * const result = await container.read();
   * if (!result.isError) {
   *   // Returns true or false
   *   console.log(container.isRootContainer());
   * }
   * ```
   */
  isRootContainer(): boolean | undefined {
    return this.rootContainer;
  }

  /**
   * ===========================================================================
   * READ METHODS
   * ===========================================================================
   */

  /**
   * @internal
   * A helper method updates this container's internal state upon read success
   * @param result - the result of the read success
   */
  protected updateWithReadSuccess(
    result: ReadSuccess<this> | ContainerReadSuccess,
  ): void {
    super.updateWithReadSuccess(result);
    if (result.type === "containerReadSuccess") {
      this.rootContainer = (result as ContainerReadSuccess).isRootContainer;
    }
  }

  /**
   * Reads the container
   * @returns A read result
   *
   * @example
   * ```typescript
   * const result = await container.read();
   * if (result.isError) {
   *   // Do something
   * }
   * ```
   */
  async read(): Promise<ReadContainerResult> {
    const result = (await this.handleRead()) as ReadContainerResult;
    return { ...result, resource: this };
  }

  /**
   * @internal
   * Converts the current state of this container to a readResult
   * @returns a ReadContainerResult
   */
  protected toReadResult(): ReadContainerResult {
    if (this.isAbsent()) {
      return {
        isError: false,
        type: "absentReadSuccess",
        uri: this.uri,
        recalledFromMemory: true,
        resource: this,
      };
    } else {
      return {
        isError: false,
        type: "containerReadSuccess",
        uri: this.uri,
        recalledFromMemory: true,
        isRootContainer: this.isRootContainer()!,
        resource: this,
      };
    }
  }

  /**
   * Makes a request to read this container if it hasn't been fetched yet. If it
   * has, return the cached informtation
   * @returns a ReadContainerResult
   *
   * @example
   * ```typescript
   * const result = await container.read();
   * if (!result.isError) {
   *   // Will execute without making a request
   *   const result2 = await container.readIfUnfetched();
   * }
   * ```
   */
  async readIfUnfetched(): Promise<ReadContainerResult> {
    return super.readIfUnfetched() as Promise<ReadContainerResult>;
  }

  /**
   * ===========================================================================
   * PARENT CONTAINER METHODS
   * ===========================================================================
   */

  /**
   * @internal
   * Checks if this container is a root container by making a request
   * @returns CheckRootResult
   */
  private async checkIfIsRootContainer(): Promise<CheckRootResult> {
    const rootContainerResult = await this.requester.isRootContainer();
    this.status = rootContainerResult;
    if (rootContainerResult.isError) return rootContainerResult;
    this.rootContainer = rootContainerResult.isRootContainer;
    this.emit("update");
    return { ...rootContainerResult, resource: this };
  }

  /**
   * Gets the root container of this container. If this container is the root
   * container, this function returns itself.
   * @returns The root container for this container or undefined if there is no
   * root container.
   *
   * @example
   * Suppose the root container is at `https://example.com/`
   *
   * ```typescript
   * const container = ldoSolidDataset
   *   .getResource("https://example.com/container/");
   * const rootContainer = await container.getRootContainer();
   * if (!rootContainer.isError) {
   *   // logs "https://example.com/"
   *   console.log(rootContainer.uri);
   * }
   * ```
   */
  async getRootContainer(): Promise<
    SolidContainer | CheckRootResultError | NoRootContainerError<SolidContainer>
  > {
    const parentContainerResult = await this.getParentContainer();
    if (parentContainerResult?.isError) return parentContainerResult;
    if (!parentContainerResult) {
      return this.isRootContainer() ? this : new NoRootContainerError(this);
    }
    return parentContainerResult.getRootContainer();
  }

  /**
   * Gets the parent container for this container by making a request
   * @returns The parent container or undefined if there is no parent container
   * because this container is the root container
   *
   * @example
   * Suppose the root container is at `https://example.com/`
   *
   * ```typescript
   * const root = solidLdoDataset.getResource("https://example.com/");
   * const container = solidLdoDataset
   *   .getResource("https://example.com/container");
   * const rootParent = await root.getParentContainer();
   * console.log(rootParent); // Logs "undefined"
   * const containerParent = await container.getParentContainer();
   * if (!containerParent.isError) {
   *   // Logs "https://example.com/"
   *   console.log(containerParent.uri);
   * }
   * ```
   */
  async getParentContainer(): Promise<
    SolidContainer | CheckRootResultError | undefined
  > {
    if (this.rootContainer === undefined) {
      const checkResult = await this.checkIfIsRootContainer();
      if (checkResult.isError) return checkResult;
    }
    if (this.rootContainer) return undefined;
    const parentUri = getParentUri(this.uri);
    if (!parentUri) {
      return undefined;
    }
    return this.context.dataset.getResource(parentUri);
  }

  /**
   * Lists the currently cached children of this container (no request is made)
   * @returns An array of children
   *
   * ```typescript
   * const result = await container.read();
   * if (!result.isError) {
   *   const children = container.children();
   *   children.forEach((child) => {
   *     console.log(child.uri);
   *   });
   * }
   * ```
   */
  children(): (SolidContainer | SolidLeaf)[] {
    const childQuads = this.context.dataset.match(
      namedNode(this.uri),
      ldpContains,
      null,
      namedNode(this.uri),
    );
    return childQuads.toArray().map((childQuad) => {
      return this.context.dataset.getResource(childQuad.object.value) as
        | SolidContainer
        | SolidLeaf;
    });
  }

  /**
   * Returns a child resource with a given name (slug)
   * @param slug - the given name for that child resource
   * @returns the child resource (either a Leaf or Container depending on the
   * name)
   *
   * @example
   * ```typescript
   * const root = solidLdoDataset.getResource("https://example.com/");
   * const container = solidLdoDataset.child("container/");
   * // Logs "https://example.com/container/"
   * console.log(container.uri);
   * const resource = container.child("resource.ttl");
   * // Logs "https://example.com/container/resource.ttl"
   * console.log(resource.uri);
   * ```
   */
  child(slug: SolidContainerSlug): SolidContainer;
  child(slug: SolidLeafSlug): SolidLeaf;
  child(slug: string): SolidLeaf | SolidContainer;
  child(slug: string): SolidLeaf | SolidContainer {
    return this.context.dataset.getResource(`${this.uri}${slug}`) as
      | SolidLeaf
      | SolidContainer;
  }

  /**
   * ===========================================================================
   * CHILD CREATORS
   * ===========================================================================
   */

  /**
   * Creates a resource and overwrites any existing resource that existed at the
   * URI
   *
   * @param slug - the name of the resource
   * @return the result of creating that resource
   *
   * @example
   * ```typescript
   * const container = solidLdoDataset
   *   .getResource("https://example.com/container/");
   * cosnt result = await container.createChildAndOverwrite("resource.ttl");
   * if (!result.isError) {
   *   // Do something
   * }
   * ```
   */
  createChildAndOverwrite(
    slug: SolidContainerSlug,
  ): Promise<ContainerCreateAndOverwriteResult>;
  createChildAndOverwrite(
    slug: SolidLeafSlug,
  ): Promise<LeafCreateAndOverwriteResult>;
  createChildAndOverwrite(
    slug: string,
  ): Promise<ContainerCreateAndOverwriteResult | LeafCreateAndOverwriteResult>;
  createChildAndOverwrite(
    slug: string,
  ): Promise<ContainerCreateAndOverwriteResult | LeafCreateAndOverwriteResult> {
    return this.child(slug).createAndOverwrite();
  }

  /**
   * Creates a resource only if that resource doesn't already exist on the Solid
   * Pod
   *
   * @param slug - the name of the resource
   * @return the result of creating that resource
   *
   * @example
   * ```typescript
   * const container = solidLdoDataset
   *   .getResource("https://example.com/container/");
   * cosnt result = await container.createChildIfAbsent("resource.ttl");
   * if (!result.isError) {
   *   // Do something
   * }
   * ```
   */
  createChildIfAbsent(
    slug: SolidContainerSlug,
  ): Promise<ContainerCreateIfAbsentResult>;
  createChildIfAbsent(slug: SolidLeafSlug): Promise<LeafCreateIfAbsentResult>;
  createChildIfAbsent(
    slug: string,
  ): Promise<ContainerCreateIfAbsentResult | LeafCreateIfAbsentResult>;
  createChildIfAbsent(
    slug: string,
  ): Promise<ContainerCreateIfAbsentResult | LeafCreateIfAbsentResult> {
    return this.child(slug).createIfAbsent();
  }

  /**
   * Creates a new binary resource and overwrites any existing resource that
   * existed at the URI
   *
   * @param slug - the name of the resource
   * @return the result of creating that resource
   *
   * @example
   * ```typescript
   * const container = solidLdoDataset
   *   .getResource("https://example.com/container/");
   * cosnt result = await container.uploadChildAndOverwrite(
   *   "resource.txt",
   *   new Blob("some text."),
   *   "text/txt",
   * );
   * if (!result.isError) {
   *   // Do something
   * }
   * ```
   */
  async uploadChildAndOverwrite(
    slug: SolidLeafSlug,
    blob: Blob,
    mimeType: string,
  ): Promise<LeafCreateAndOverwriteResult> {
    return this.child(slug).uploadAndOverwrite(blob, mimeType);
  }

  /**
   * Creates a new binary resource and overwrites any existing resource that
   * existed at the URI
   *
   * @param slug - the name of the resource
   * @return the result of creating that resource
   *
   * @example
   * ```typescript
   * const container = solidLdoDataset
   *   .getResource("https://example.com/container/");
   * cosnt result = await container.uploadChildIfAbsent(
   *   "resource.txt",
   *   new Blob("some text."),
   *   "text/txt",
   * );
   * if (!result.isError) {
   *   // Do something
   * }
   * ```
   */
  async uploadChildIfAbsent(
    slug: SolidLeafSlug,
    blob: Blob,
    mimeType: string,
  ): Promise<LeafCreateIfAbsentResult> {
    return this.child(slug).uploadIfAbsent(blob, mimeType);
  }

  /**
   * Deletes all contents in this container
   * @returns An AggregateSuccess or Aggregate error corresponding with all the
   * deleted resources
   *
   * @example
   * ```typescript
   * const result = container.clear();
   * if (!result.isError) {
   *   console.log("All deleted resources:");
   *   result.results.forEach((result) => console.log(result.uri));
   * }
   * ```
   */
  async clear(): Promise<
    | AggregateSuccess<DeleteSuccess<SolidContainer | SolidLeaf>>
    | AggregateError<
        | DeleteResultError<SolidContainer | SolidLeaf>
        | ReadResultError<SolidContainer | SolidLeaf>
      >
  > {
    const readResult = await this.read();
    if (readResult.isError) return new AggregateError([readResult]);
    const results = (
      await Promise.all(
        this.children().map(async (child) => {
          return child.delete();
        }),
      )
    ).flat();
    const errors = results.filter(
      (value): value is HttpErrorResultType<this> => value.isError,
    );
    if (errors.length > 0) {
      return new AggregateError(errors);
    }
    return new AggregateSuccess(
      results as DeleteSuccess<SolidContainer | SolidLeaf>[],
    );
  }

  /**
   * Deletes this container and all its contents
   * @returns A Delete result for this container
   *
   * ```typescript
   * const result = await container.delete();
   * if (!result.isError) {
   *   // Do something
   * }
   * ```
   */
  async delete(): Promise<
    | DeleteResult<this>
    | AggregateError<
        | DeleteResultError<SolidContainer | SolidLeaf>
        | ReadResultError<SolidContainer | SolidLeaf>
      >
  > {
    const clearResult = await this.clear();
    if (clearResult.isError) return clearResult;
    const deleteResult = await this.handleDelete();
    if (deleteResult.isError) return deleteResult;
    return { ...deleteResult, resource: this };
  }

  protected async handleDelete(): Promise<DeleteResult<this>> {
    return super.handleDelete() as Promise<DeleteResult<this>>;
  }

  /**
   * Creates a container at this URI and overwrites any that already exists
   * @returns ContainerCreateAndOverwriteResult
   *
   * @example
   * ```typescript
   * const result = await container.createAndOverwrite();
   * if (!result.isError) {
   *   // Do something
   * }
   * ```
   */
  async createAndOverwrite(): Promise<ContainerCreateAndOverwriteResult> {
    const createResult =
      (await this.handleCreateAndOverwrite()) as ContainerCreateAndOverwriteResult;
    if (createResult.isError) return createResult;
    return { ...createResult, resource: this };
  }

  /**
   * Creates a container at this URI if the container doesn't already exist
   * @returns ContainerCreateIfAbsentResult
   *
   * @example
   * ```typescript
   * const result = await container.createIfAbsent();
   * if (!result.isError) {
   *   // Do something
   * }
   * ```
   */
  async createIfAbsent(): Promise<ContainerCreateIfAbsentResult> {
    const createResult =
      (await this.handleCreateIfAbsent()) as ContainerCreateIfAbsentResult;
    if (createResult.isError) return createResult;
    return { ...createResult, resource: this };
  }

  /**
   * You cannot update a Container, so we return an IgnoredInvalidUpdateSuccess
   */
  async update(
    _datasetChanges: DatasetChanges,
  ): Promise<IgnoredInvalidUpdateSuccess<this>> {
    return new IgnoredInvalidUpdateSuccess(this);
  }
}
