import { v4 } from "uuid";
import type { ConnectedPlugin } from "../types/ConnectedPlugin.js";
import type { ConnectedContext } from "../types/ConnectedContext.js";
import type { SubscriptionCallbacks } from "./SubscriptionCallbacks.js";
import type { NotificationCallbackError } from "../results/error/NotificationErrors.js";

/**
 * @internal
 * Abstract class for notification subscription methods.
 */
export abstract class NotificationSubscription<
  Plugin extends ConnectedPlugin,
  NotificationMessage,
> {
  protected resource: Plugin["types"]["resource"];
  protected parentSubscription: (message: NotificationMessage) => void;
  protected context: ConnectedContext<Plugin[]>;
  protected subscriptions: Record<
    string,
    SubscriptionCallbacks<NotificationMessage>
  > = {};
  private isOpen: boolean = false;

  constructor(
    resource: Plugin["types"]["resource"],
    parentSubscription: (message: NotificationMessage) => void,
    context: ConnectedContext<Plugin[]>,
  ) {
    this.resource = resource;
    this.parentSubscription = parentSubscription;
    this.context = context;
  }

  public isSubscribedToNotifications(): boolean {
    return this.isOpen;
  }

  /**
   * ===========================================================================
   * PUBLIC
   * ===========================================================================
   */

  /**
   * @internal
   * subscribeToNotifications
   */
  async subscribeToNotifications(
    subscriptionCallbacks?: SubscriptionCallbacks<NotificationMessage>,
  ): Promise<string> {
    const subscriptionId = v4();
    this.subscriptions[subscriptionId] = subscriptionCallbacks ?? {};
    if (!this.isOpen) {
      await this.open();
      this.setIsOpen(true);
    }
    return subscriptionId;
  }

  /**
   * @internal
   * unsubscribeFromNotification
   */
  async unsubscribeFromNotification(subscriptionId: string): Promise<void> {
    if (
      !!this.subscriptions[subscriptionId] &&
      Object.keys(this.subscriptions).length === 1
    ) {
      await this.close();
      this.setIsOpen(false);
    }
    delete this.subscriptions[subscriptionId];
  }

  /**
   * @internal
   * unsubscribeFromAllNotifications
   */
  async unsubscribeFromAllNotifications(): Promise<void> {
    await Promise.all(
      Object.keys(this.subscriptions).map((id) =>
        this.unsubscribeFromNotification(id),
      ),
    );
  }

  /**
   * ===========================================================================
   * HELPERS
   * ===========================================================================
   */

  /**
   * @internal
   * Opens the subscription
   */
  protected abstract open(): Promise<void>;

  /**
   * @internal
   * Closes the subscription
   */
  protected abstract close(): Promise<void>;

  /**
   * ===========================================================================
   * CALLBACKS
   * ===========================================================================
   */

  /**
   * @internal
   * onNotification
   */
  protected onNotification(message: NotificationMessage): void {
    this.parentSubscription(message);
    Object.values(this.subscriptions).forEach(({ onNotification }) => {
      onNotification?.(message);
    });
  }

  /**
   * @internal
   * onNotificationError
   */
  protected onNotificationError(
    message: NotificationCallbackError<Plugin["types"]["resource"]>,
  ): void {
    Object.values(this.subscriptions).forEach(({ onNotificationError }) => {
      onNotificationError?.(message);
    });
    if (message.type === "disconnectedNotAttemptingReconnectError") {
      this.setIsOpen(false);
    }
  }

  /**
   * @internal
   * setIsOpen
   */
  protected setIsOpen(status: boolean) {
    const shouldUpdate = status !== this.isOpen;
    this.isOpen = status;
    if (shouldUpdate) this.resource.emit("update");
  }
}
