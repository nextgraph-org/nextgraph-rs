import type { ShapeType } from "@ng-org/shex-orm";
import { notificationSchema } from "./notification.schema";
import type { UserNotification } from "./notification.typings";

// ShapeTypes for notification
export const UserNotificationShapeType: ShapeType<UserNotification> = {
  schema: notificationSchema,
  shape: "did:ng:x:social:notification#UserNotification",
};
