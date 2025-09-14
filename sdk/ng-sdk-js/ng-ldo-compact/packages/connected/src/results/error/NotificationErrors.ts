import type { Resource } from "../../Resource.js";
import type { UnexpectedResourceError } from "./ErrorResult.js";
import { ResourceError } from "./ErrorResult.js";

export type NotificationCallbackError<ResourceType extends Resource> =
  | DisconnectedAttemptingReconnectError<ResourceType>
  | DisconnectedNotAttemptingReconnectError<ResourceType>
  | UnsupportedNotificationError<ResourceType>
  | UnexpectedResourceError<ResourceType>;

/**
 * Indicates that the requested method for receiving notifications is not
 * supported by this Pod.
 */
export class UnsupportedNotificationError<
  ResourceType extends Resource,
> extends ResourceError<ResourceType> {
  readonly type = "unsupportedNotificationError" as const;
}

/**
 * Indicates that the socket has disconnected and is attempting to reconnect.
 */
export class DisconnectedAttemptingReconnectError<
  ResourceType extends Resource,
> extends ResourceError<ResourceType> {
  readonly type = "disconnectedAttemptingReconnectError" as const;
}

/**
 * Indicates that the socket has disconnected and is attempting to reconnect.
 */
export class DisconnectedNotAttemptingReconnectError<
  ResourceType extends Resource,
> extends ResourceError<ResourceType> {
  readonly type = "disconnectedNotAttemptingReconnectError" as const;
}
