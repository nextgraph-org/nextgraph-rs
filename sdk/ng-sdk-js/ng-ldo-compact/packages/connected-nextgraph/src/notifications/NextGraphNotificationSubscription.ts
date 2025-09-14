import { NotificationSubscription } from "@ldo/connected";
import type { NextGraphConnectedPlugin } from "../NextGraphConnectedPlugin.js";
import type { NextGraphNotificationMessage } from "./NextGraphNotificationMessage.js";

export class NextGraphNotificationSubscription extends NotificationSubscription<
  NextGraphConnectedPlugin,
  NextGraphNotificationMessage
> {
  private unsub: (() => void) | undefined;

  protected async open(): Promise<void> {
    this.unsub = await this.context.nextgraph.ng.doc_subscribe(
      this.resource.uri,
      this.context.nextgraph.sessionId,
      this.onNotification.bind(this),
    );
  }

  protected async close(): Promise<void> {
    this.unsub?.();
    this.unsub = undefined;
  }
}
