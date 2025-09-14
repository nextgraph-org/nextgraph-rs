/**
 * A set of callback functions that are called when a resource recieves a
 * notification
 */
export interface SubscriptionCallbacks<NotificationMessage> {
  /**
   * Triggers when a notification was received.
   */
  onNotification?: (message: NotificationMessage) => void;
  /**
   * Triggers when a notification error was received.
   */
  // TODO: make notification errors more specific
  onNotificationError?: (error: Error) => void;
}
