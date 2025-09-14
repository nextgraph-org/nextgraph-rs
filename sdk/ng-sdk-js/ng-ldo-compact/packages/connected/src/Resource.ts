/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ConnectedResult } from "./results/ConnectedResult.js";
import type { DatasetChanges } from "@ldo/rdf-utils";
import type {
  IgnoredInvalidUpdateSuccess,
  UpdateSuccess,
} from "./results/success/UpdateSuccess.js";
import type { ResourceError } from "./results/error/ErrorResult.js";
import type { ReadSuccess } from "./results/success/ReadSuccess.js";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type ResourceEventEmitter = import("typed-emitter").default<{
  update: () => void;
  notification: () => void;
}>;

/**
 * A resource is an abstract representation for a group of data on a remote
 * platform. For example, "Solid" has resources that could be containers or
 * leafs.
 */
export interface Resource<UriType extends string = string>
  extends ResourceEventEmitter {
  /**
   * Indicates that this is not an error
   */
  readonly isError: false;
  /**
   * The uri of the resource
   */
  readonly uri: UriType;
  /**
   * The name of the resource. For example "NextGraphResource"
   */
  readonly type: string;
  /**
   * The most recent result from one of the resource methods.
   */
  status: ConnectedResult;
  /**
   * Returns true if this resource is currently loading.
   */
  isLoading(): boolean;
  /**
   * Returns true if this resource has performed a fetch at least once
   */
  isFetched(): boolean;
  /**
   * Returns true if this reosource has not performed a fetch at least once
   */
  isUnfetched(): boolean;
  /**
   * Returns true if this resource is currently performing its first fetch
   */
  isDoingInitialFetch(): boolean;
  /**
   * Returns true if this resource exists. Returns undefined if that is
   * currently unknown.
   */
  isPresent(): boolean | undefined;
  /**
   * Returns true if its confirmed that this resource doesn't exist. Returns
   * undefined if that is currently unknown.
   */
  isAbsent(): boolean | undefined;
  /**
   * Returns true if this resource is currently subscribed to notifications.
   */
  isSubscribedToNotifications(): boolean;
  /**
   * Fetches the resource.
   */
  read(): Promise<ReadSuccess<any> | ResourceError<any>>;
  /**
   * Fetches the resource if it hasn't been fetched yet.
   */
  readIfUnfetched(): Promise<ReadSuccess<any> | ResourceError<any>>;
  /**
   * Applies updates to this resource.
   * @param datasetChanges - A list of changes to data
   */
  update(
    datasetChanges: DatasetChanges,
  ): Promise<
    UpdateSuccess<any> | IgnoredInvalidUpdateSuccess<any> | ResourceError<any>
  >;
  /**
   * Begins a subscription to this resource
   * @param callbacks - optional set of callbacks to be called when this
   * resource is updated
   */
  subscribeToNotifications(callbacks?: {
    onNotification: (message: any) => void;
    onNotificationError: (err: Error) => void;
  }): Promise<string>;
  /**
   * Unsubscribes from notifications on this resource
   * @param subscriptionId the Id of the subscription to unsubscribe
   */
  unsubscribeFromNotifications(subscriptionId: string): Promise<void>;
  /**
   * Unsubscribes from all notifications.
   */
  unsubscribeFromAllNotifications(): Promise<void>;
}
