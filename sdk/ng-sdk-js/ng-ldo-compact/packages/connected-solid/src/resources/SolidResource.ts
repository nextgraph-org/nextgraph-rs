import type {
  ConnectedContext,
  ConnectedResult,
  IgnoredInvalidUpdateSuccess,
  ReadSuccess,
  Resource,
  ResourceEventEmitter,
  ResourceSuccess,
  SubscriptionCallbacks,
  Unfetched,
} from "@ldo/connected";
import type { SolidContainerUri, SolidLeafUri } from "../types.js";
import EventEmitter from "events";
import type { SolidConnectedPlugin } from "../SolidConnectedPlugin.js";
import type { BatchedRequester } from "../requester/BatchedRequester.js";
import type { WacRule } from "../wac/WacRule.js";
import type { NotificationSubscription } from "@ldo/connected";
import { Websocket2023NotificationSubscription } from "../notifications/Websocket2023NotificationSubscription.js";
import { getParentUri } from "../util/rdfUtils.js";
import { isReadSuccess } from "../requester/results/success/SolidReadSuccess.js";
import type {
  ReadContainerResult,
  ReadLeafResult,
} from "../requester/requests/readResource.js";
import { DeleteSuccess } from "../requester/results/success/DeleteSuccess.js";
import {
  updateDatasetOnSuccessfulDelete,
  type DeleteResult,
} from "../requester/requests/deleteResource.js";
import type {
  ContainerCreateAndOverwriteResult,
  ContainerCreateIfAbsentResult,
  LeafCreateAndOverwriteResult,
  LeafCreateIfAbsentResult,
} from "../requester/requests/createDataResource.js";
import type { SolidContainer } from "./SolidContainer.js";
import type { CheckRootResultError } from "../requester/requests/checkRootContainer.js";
import type { NoRootContainerError } from "../requester/results/error/NoRootContainerError.js";
import type { SolidLeaf } from "./SolidLeaf.js";
import type { GetWacUriError } from "../wac/getWacUri.js";
import { getWacUri, type GetWacUriResult } from "../wac/getWacUri.js";
import type { GetWacRuleError } from "../wac/getWacRule.js";
import { getWacRuleWithAclUri } from "../wac/getWacRule.js";
import type { SetWacRuleResult } from "../wac/setWacRule.js";
import { setWacRuleForAclUri } from "../wac/setWacRule.js";
import { NoncompliantPodError } from "../requester/results/error/NoncompliantPodError.js";
import type { SolidNotificationMessage } from "../notifications/SolidNotificationMessage.js";
import type { CreateSuccess } from "../requester/results/success/CreateSuccess.js";
import { GetWacUriSuccess } from "../wac/results/GetWacUriSuccess.js";
import { GetWacRuleSuccess } from "../wac/results/GetWacRuleSuccess.js";
import type { DatasetChanges } from "@ldo/rdf-utils";
import type { UpdateResult } from "../requester/requests/updateDataResource.js";

/**
 * Statuses shared between both Leaf and Container
 */
export type SharedStatuses<ResourceType extends SolidLeaf | SolidContainer> =
  | Unfetched<ResourceType>
  | DeleteResult<ResourceType>
  | CreateSuccess<ResourceType>;

export abstract class SolidResource
  extends (EventEmitter as new () => ResourceEventEmitter)
  implements Resource<SolidLeafUri | SolidContainerUri>
{
  /**
   * @internal
   * The ConnectedContext from the Parent Dataset
   */
  protected readonly context: ConnectedContext<SolidConnectedPlugin[]>;

  /**
   * The uri of the resource
   */
  abstract readonly uri: SolidLeafUri | SolidContainerUri;

  /**
   * The type of resource (leaf or container)
   */
  abstract readonly type: "SolidLeaf" | "SolidContainer";

  /**
   * The status of the last request made for this resource
   */
  abstract status: ConnectedResult;

  /**
   * @internal
   * Batched Requester for the Resource
   */
  protected abstract readonly requester: BatchedRequester<
    SolidLeaf | SolidContainer
  >;

  /**
   * @internal
   * True if this resource has been fetched at least once
   */
  protected didInitialFetch: boolean = false;

  /**
   * @internal
   * True if this resource has been fetched but does not exist
   */
  protected absent: boolean | undefined;

  /**
   * @internal
   * If a wac uri is fetched, it is cached here
   */
  protected wacUri?: SolidLeafUri;

  /**
   * @internal
   * If a wac rule was fetched, it is cached here
   */
  protected wacRule?: WacRule;

  /**
   * @internal
   * Handles notification subscriptions
   */
  protected notificationSubscription: NotificationSubscription<
    SolidConnectedPlugin,
    SolidNotificationMessage
  >;

  /**
   * Indicates that resources are not errors
   */
  public readonly isError: false = false as const;

  /**
   * @param context - SolidLdoDatasetContext for the parent dataset
   */
  constructor(context: ConnectedContext<SolidConnectedPlugin[]>) {
    super();
    this.context = context;
    this.notificationSubscription = new Websocket2023NotificationSubscription(
      this as unknown as SolidLeaf | SolidContainer,
      this.onNotification.bind(this),
      this.context,
    );
  }

  /**
   * ===========================================================================
   * GETTERS
   * ===========================================================================
   */

  /**
   * Checks to see if this resource is loading in any way
   * @returns true if the resource is currently loading
   *
   * @example
   * ```typescript
   * resource.read().then(() => {
   *   // Logs "false"
   *   console.log(resource.isLoading())
   * });
   * // Logs "true"
   * console.log(resource.isLoading());
   * ```
   */
  isLoading(): boolean {
    return this.requester.isLoading();
  }

  /**
   * Checks to see if this resource is being created
   * @returns true if the resource is currently being created
   *
   * @example
   * ```typescript
   * resource.read().then(() => {
   *   // Logs "false"
   *   console.log(resource.isCreating())
   * });
   * // Logs "true"
   * console.log(resource.isCreating());
   * ```
   */
  isCreating(): boolean {
    return this.requester.isCreating();
  }

  /**
   * Checks to see if this resource is being read
   * @returns true if the resource is currently being read
   *
   * @example
   * ```typescript
   * resource.read().then(() => {
   *   // Logs "false"
   *   console.log(resource.isReading())
   * });
   * // Logs "true"
   * console.log(resource.isReading());
   * ```
   */
  isReading(): boolean {
    return this.requester.isReading();
  }

  /**
   * Checks to see if this resource is being deleted
   * @returns true if the resource is currently being deleted
   *
   * @example
   * ```typescript
   * resource.read().then(() => {
   *   // Logs "false"
   *   console.log(resource.isDeleting())
   * });
   * // Logs "true"
   * console.log(resource.isDeleting());
   * ```
   */
  isDeleting(): boolean {
    return this.requester.isDeletinng();
  }

  /**
   * Checks to see if this resource is being read for the first time
   * @returns true if the resource is currently being read for the first time
   *
   * @example
   * ```typescript
   * resource.read().then(() => {
   *   // Logs "false"
   *   console.log(resource.isDoingInitialFetch())
   * });
   * // Logs "true"
   * console.log(resource.isDoingInitialFetch());
   * ```
   */
  isDoingInitialFetch(): boolean {
    return this.isReading() && !this.isFetched();
  }

  /**
   * Checks to see if this resource is being read for a subsequent time
   * @returns true if the resource is currently being read for a subsequent time
   *
   * @example
   * ```typescript
   * await resource.read();
   * resource.read().then(() => {
   *   // Logs "false"
   *   console.log(resource.isCreating())
   * });
   * // Logs "true"
   * console.log(resource.isCreating());
   * ```
   */
  isReloading(): boolean {
    return this.isReading() && this.isFetched();
  }

  /**
   * ===========================================================================
   * CHECKERS
   * ===========================================================================
   */

  /**
   * Check to see if this resource has been fetched
   * @returns true if this resource has been fetched before
   *
   * @example
   * ```typescript
   * // Logs "false"
   * console.log(resource.isFetched());
   * const result = await resource.read();
   * if (!result.isError) {
   *   // Logs "true"
   *   console.log(resource.isFetched());
   * }
   * ```
   */
  isFetched(): boolean {
    return this.didInitialFetch;
  }

  /**
   * Check to see if this resource is currently unfetched
   * @returns true if the resource is currently unfetched
   *
   * @example
   * ```typescript
   * // Logs "true"
   * console.log(resource.isUnetched());
   * const result = await resource.read();
   * if (!result.isError) {
   *   // Logs "false"
   *   console.log(resource.isUnfetched());
   * }
   * ```
   */
  isUnfetched(): boolean {
    return !this.didInitialFetch;
  }

  /**
   * Is this resource currently absent (it does not exist)
   * @returns true if the resource is absent, false if not, undefined if unknown
   *
   * @example
   * ```typescript
   * // Logs "undefined"
   * console.log(resource.isAbsent());
   * const result = await resource.read();
   * if (!result.isError) {
   *   // False if the resource exists, true if it does not
   *   console.log(resource.isAbsent());
   * }
   * ```
   */
  isAbsent(): boolean | undefined {
    return this.absent;
  }

  /**
   * Is this resource currently present on the Pod
   * @returns false if the resource is absent, true if not, undefined if unknown
   *
   * @example
   * ```typescript
   * // Logs "undefined"
   * console.log(resource.isPresent());
   * const result = await resource.read();
   * if (!result.isError) {
   *   // True if the resource exists, false if it does not
   *   console.log(resource.isPresent());
   * }
   * ```
   */
  isPresent(): boolean | undefined {
    return this.absent === undefined ? undefined : !this.absent;
  }

  /**
   * Is this resource currently listening to notifications from this document
   * @returns true if the resource is subscribed to notifications, false if not
   *
   * @example
   * ```typescript
   * await resource.subscribeToNotifications();
   * // Logs "true"
   * console.log(resource.isSubscribedToNotifications());
   * ```
   */
  isSubscribedToNotifications(): boolean {
    return this.notificationSubscription.isSubscribedToNotifications();
  }

  /**
   * ===========================================================================
   * HELPER METHODS
   * ===========================================================================
   */

  /**
   * @internal
   * Emits an update event for both this resource and the parent
   */
  protected emitThisAndParent() {
    this.emit("update");
    const parentUri = getParentUri(this.uri);
    if (parentUri) {
      const parentContainer = this.context.dataset.getResource(parentUri);
      parentContainer.emit("update");
    }
  }

  /**
   * ===========================================================================
   * READ METHODS
   * ===========================================================================
   */

  /**
   * @internal
   * A helper method updates this resource's internal state upon read success
   * @param result - the result of the read success
   */
  protected updateWithReadSuccess(result: ReadSuccess<Resource>) {
    this.absent = result.type === "absentReadSuccess";
    this.didInitialFetch = true;
  }

  /**
   * @internal
   * A helper method that handles the core functions for reading
   * @returns ReadResult
   */
  protected async handleRead(): Promise<ReadContainerResult | ReadLeafResult> {
    const result = await this.requester.read();
    this.status = result;
    if (result.isError) {
      this.emit("update");
      return result;
    }
    this.updateWithReadSuccess(result);
    this.emitThisAndParent();
    return result;
  }

  /**
   * @internal
   * Converts the current state of this resource to a readResult
   * @returns a ReadResult
   */
  protected abstract toReadResult(): ReadLeafResult | ReadContainerResult;

  /**
   * Reads the resource
   */
  abstract read(): Promise<ReadLeafResult | ReadContainerResult>;

  /**
   * Reads the resource if it isn't fetched yet
   * @returns a ReadResult
   */
  async readIfUnfetched(): Promise<ReadLeafResult | ReadContainerResult> {
    if (this.didInitialFetch) {
      const readResult = this.toReadResult();
      this.status = readResult;
      return readResult;
    }
    return this.read();
  }

  /**
   * ===========================================================================
   * DELETE METHODS
   * ===========================================================================
   */

  /**
   * @internal
   * A helper method updates this resource's internal state upon delete success
   * @param result - the result of the delete success
   */
  public updateWithDeleteSuccess(_result: DeleteSuccess<SolidResource>) {
    this.absent = true;
    this.didInitialFetch = true;
  }

  /**
   * @internal
   * Helper method that handles the core functions for deleting a resource
   * @returns DeleteResult
   */
  protected async handleDelete(): Promise<
    DeleteResult<SolidLeaf | SolidContainer>
  > {
    const result = await this.requester.delete();
    this.status = result;
    if (result.isError) {
      this.emit("update");
      return result;
    }
    this.updateWithDeleteSuccess(result);
    this.emitThisAndParent();
    return result;
  }

  /**
   * ===========================================================================
   * CREATE METHODS
   * ===========================================================================
   */

  /**
   * A helper method updates this resource's internal state upon create success
   * @param _result - the result of the create success
   */
  protected updateWithCreateSuccess(result: ResourceSuccess<Resource>) {
    this.absent = false;
    this.didInitialFetch = true;
    if (isReadSuccess(result)) {
      this.updateWithReadSuccess(result as ReadSuccess<this>);
    }
  }

  /**
   * Creates a resource at this URI and overwrites any that already exists
   * @returns CreateAndOverwriteResult
   *
   * @example
   * ```typescript
   * const result = await resource.createAndOverwrite();
   * if (!result.isError) {
   *   // Do something
   * }
   * ```
   */
  abstract createAndOverwrite(): Promise<
    ContainerCreateAndOverwriteResult | LeafCreateAndOverwriteResult
  >;

  /**
   * @internal
   * Helper method that handles the core functions for creating and overwriting
   * a resource
   * @returns DeleteResult
   */
  protected async handleCreateAndOverwrite(): Promise<
    ContainerCreateAndOverwriteResult | LeafCreateAndOverwriteResult
  > {
    const result = await this.requester.createDataResource(true);
    this.status = result;
    if (result.isError) {
      this.emit("update");
      return result;
    }
    this.updateWithCreateSuccess(result);
    this.emitThisAndParent();
    return result;
  }

  /**
   * Creates a resource at this URI if the resource doesn't already exist
   * @returns CreateIfAbsentResult
   *
   * @example
   * ```typescript
   * const result = await leaf.createIfAbsent();
   * if (!result.isError) {
   *   // Do something
   * }
   * ```
   */
  abstract createIfAbsent(): Promise<
    ContainerCreateIfAbsentResult | LeafCreateIfAbsentResult
  >;

  /**
   * @internal
   * Helper method that handles the core functions for creating a resource if
   *  absent
   * @returns DeleteResult
   */
  protected async handleCreateIfAbsent(): Promise<
    ContainerCreateIfAbsentResult | LeafCreateIfAbsentResult
  > {
    const result = await this.requester.createDataResource();
    this.status = result;
    if (result.isError) {
      this.emit("update");
      return result;
    }
    this.updateWithCreateSuccess(result);
    this.emitThisAndParent();
    return result;
  }

  /**
   * UPDATE METHODS
   */
  abstract update(
    datasetChanges: DatasetChanges,
  ): Promise<
    UpdateResult<SolidLeaf> | IgnoredInvalidUpdateSuccess<SolidContainer>
  >;

  /**
   * ===========================================================================
   * PARENT CONTAINER METHODS
   * ===========================================================================
   */

  /**
   * Gets the root container for this resource.
   * @returns The root container for this resource
   *
   * @example
   * Suppose the root container is at `https://example.com/`
   *
   * ```typescript
   * const resource = ldoSolidDataset
   *   .getResource("https://example.com/container/resource.ttl");
   * const rootContainer = await resource.getRootContainer();
   * if (!rootContainer.isError) {
   *   // logs "https://example.com/"
   *   console.log(rootContainer.uri);
   * }
   * ```
   */
  abstract getRootContainer(): Promise<
    | SolidContainer
    | CheckRootResultError
    | NoRootContainerError<SolidLeaf | SolidContainer>
  >;

  abstract getParentContainer(): Promise<
    SolidContainer | CheckRootResultError | undefined
  >;

  /**
   * ===========================================================================
   * WEB ACCESS CONTROL METHODS
   * ===========================================================================
   */

  /**
   * Retrieves the URI for the web access control (WAC) rules for this resource
   * @param options - set the "ignoreCache" field to true to ignore any cached
   * information on WAC rules.
   * @returns WAC Rules results
   */
  protected async getWacUri(options?: {
    ignoreCache: boolean;
  }): Promise<GetWacUriResult<SolidLeaf | SolidContainer>> {
    const thisAsLeafOrContainer = this as unknown as SolidLeaf | SolidContainer;
    // Get the wacUri if not already present
    if (!options?.ignoreCache && this.wacUri) {
      return new GetWacUriSuccess(thisAsLeafOrContainer, this.wacUri);
    }

    const wacUriResult = await getWacUri(thisAsLeafOrContainer, {
      fetch: this.context.solid.fetch,
    });
    if (wacUriResult.isError) {
      return wacUriResult;
    }
    this.wacUri = wacUriResult.wacUri;
    return wacUriResult;
  }

  /**
   * Retrieves web access control (WAC) rules for this resource
   * @param options - set the "ignoreCache" field to true to ignore any cached
   * information on WAC rules.
   * @returns WAC Rules results
   *
   * @example
   * ```typescript
   * const resource = ldoSolidDataset
   *   .getResource("https://example.com/container/resource.ttl");
   * const wacRulesResult = await resource.getWac();
   * if (!wacRulesResult.isError) {
   *   const wacRules = wacRulesResult.wacRule;
   *   // True if the resource is publicly readable
   *   console.log(wacRules.public.read);
   *   // True if authenticated agents can write to the resource
   *   console.log(wacRules.authenticated.write);
   *   // True if the given WebId has append access
   *   console.log(
   *     wacRules.agent[https://example.com/person1/profile/card#me].append
   *   );
   *   // True if the given WebId has control access
   *   console.log(
   *     wacRules.agent[https://example.com/person1/profile/card#me].control
   *   );
   * }
   * ```
   */
  async getWac(options?: {
    ignoreCache: boolean;
  }): Promise<
    | GetWacUriError<SolidContainer | SolidLeaf>
    | GetWacRuleError<SolidContainer | SolidLeaf>
    | GetWacRuleSuccess<SolidContainer | SolidLeaf>
  > {
    const thisAsLeafOrContainer = this as unknown as SolidLeaf | SolidContainer;
    // Return the wac rule if it's already cached
    if (!options?.ignoreCache && this.wacRule) {
      return new GetWacRuleSuccess(thisAsLeafOrContainer, this.wacRule);
    }

    // Get the wac uri
    const wacUriResult = await this.getWacUri(options);
    if (wacUriResult.isError) return wacUriResult;

    // Get the wac rule
    const wacResult = await getWacRuleWithAclUri(
      wacUriResult.wacUri,
      thisAsLeafOrContainer,
      {
        fetch: this.context.solid.fetch,
      },
    );
    if (wacResult.isError) return wacResult;
    // If the wac rules was successfully found
    if (wacResult.type === "getWacRuleSuccess") {
      this.wacRule = wacResult.wacRule;
      return wacResult;
    }

    // If the WacRule is absent
    const parentResource = await this.getParentContainer();
    if (parentResource?.isError) return parentResource;
    if (!parentResource) {
      return new NoncompliantPodError(
        thisAsLeafOrContainer,
        `Resource "${this.uri}" has no Effective ACL resource`,
      );
    }
    return parentResource.getWac();
  }

  /**
   * Sets access rules for a specific resource
   * @param wacRule - the access rules to set
   * @returns SetWacRuleResult
   *
   * @example
   * ```typescript
   * const resource = ldoSolidDataset
   *   .getResource("https://example.com/container/resource.ttl");
   * const wacRulesResult = await resource.setWac({
   *   public: {
   *     read: true,
   *     write: false,
   *     append: false,
   *     control: false
   *   },
   *   authenticated: {
   *     read: true,
   *     write: false,
   *     append: true,
   *     control: false
   *   },
   *   agent: {
   *     "https://example.com/person1/profile/card#me": {
   *       read: true,
   *       write: true,
   *       append: true,
   *       control: true
   *     }
   *   }
   * });
   * ```
   */
  async setWac(
    wacRule: WacRule,
  ): Promise<
    | GetWacUriError<SolidLeaf | SolidContainer>
    | SetWacRuleResult<SolidLeaf | SolidContainer>
  > {
    const thisAsLeafOrContainer = this as unknown as SolidLeaf | SolidContainer;
    const wacUriResult = await this.getWacUri();
    if (wacUriResult.isError) return wacUriResult;

    const result = await setWacRuleForAclUri(
      wacUriResult.wacUri,
      wacRule,
      thisAsLeafOrContainer,
      {
        fetch: this.context.solid.fetch,
      },
    );
    if (result.isError) {
      this.emit("update");
      return result;
    }
    this.wacRule = result.wacRule;
    return result;
  }

  /**
   * ===========================================================================
   * SUBSCRIPTION METHODS
   * ===========================================================================
   */

  /**
   * Activates Websocket subscriptions on this resource. Updates, deletions,
   * and creations on this resource will be tracked and all changes will be
   * relected in LDO's resources and graph.
   *
   * @param onNotificationError - A callback function if there is an error
   * with notifications.
   * @returns SubscriptionId: A string to use to unsubscribe
   *
   * @example
   * ```typescript
   * const resource = solidLdoDataset
   *   .getResource("https://example.com/spiderman");
   * // A listener for if anything about spiderman in the global dataset is
   * // changed. Note that this will also listen for any local changes as well
   * // as changes to remote resources to which you have notification
   * // subscriptions enabled.
   * solidLdoDataset.addListener(
   *   [namedNode("https://example.com/spiderman#spiderman"), null, null, null],
   *   () => {
   *     // Triggers when the file changes on the Pod or locally
   *     console.log("Something changed about SpiderMan");
   *   },
   * );
   *
   * // Subscribe
   * const subscriptionId = await testContainer.subscribeToNotifications({
   *   // These are optional callbacks. A subscription will automatically keep
   *   // the dataset in sync. Use these callbacks for additional functionality.
   *   onNotification: (message) => console.log(message),
   *   onNotificationError: (err) => console.log(err.message)
   * });
   * // ... From there you can wait for a file to be changed on the Pod.
   */
  async subscribeToNotifications(
    callbacks?: SubscriptionCallbacks<SolidNotificationMessage>,
  ): Promise<string> {
    return await this.notificationSubscription.subscribeToNotifications(
      callbacks,
    );
  }

  /**
   * @internal
   * Function that triggers whenever a notification is recieved.
   */
  protected async onNotification(
    message: SolidNotificationMessage,
  ): Promise<void> {
    const objectResource = this.context.dataset.getResource(message.object);
    // Do Nothing if the resource is invalid.
    if (objectResource.type === "InvalidIdentifierResource") return;
    if (objectResource.type === "SolidLeaf") {
      switch (message.type) {
        case "Update":
        case "Add":
          await objectResource.read();
          return;
        case "Delete":
        case "Remove":
          // Delete the resource without have to make an additional read request
          updateDatasetOnSuccessfulDelete(message.object, this.context.dataset);
          objectResource.updateWithDeleteSuccess(
            new DeleteSuccess(objectResource, true),
          );
          return;
      }
    }
  }

  /**
   * Unsubscribes from changes made to this resource on the Pod
   *
   * @returns UnsubscribeResult
   *
   * @example
   * ```typescript
   * const subscriptionId = await testContainer.subscribeToNotifications();
   * await testContainer.unsubscribeFromNotifications(subscriptionId);
   * ```
   */
  async unsubscribeFromNotifications(subscriptionId: string): Promise<void> {
    return this.notificationSubscription.unsubscribeFromNotification(
      subscriptionId,
    );
  }

  /**
   * Unsubscribes from all notifications on this resource
   *
   * @returns UnsubscribeResult[]
   *
   * @example
   * ```typescript
   * const subscriptionResult = await testContainer.subscribeToNotifications();
   * await testContainer.unsubscribeFromAllNotifications();
   * ```
   */
  async unsubscribeFromAllNotifications(): Promise<void> {
    return this.notificationSubscription.unsubscribeFromAllNotifications();
  }
}
