import { ShapeType } from "@ldo/ldo";
import { notificationSchema } from "./notification.schema";
import { notificationContext } from "./notification.context";
import { UserNotification } from "./notification.typings";

/**
 * =============================================================================
 * LDO ShapeTypes notification
 * =============================================================================
 */

/**
 * UserNotification ShapeType
 */
export const UserNotificationShapeType: ShapeType<UserNotification> = {
  schema: notificationSchema,
  shape: "did:ng:x:social:notification#UserNotification",
  context: notificationContext,
};
