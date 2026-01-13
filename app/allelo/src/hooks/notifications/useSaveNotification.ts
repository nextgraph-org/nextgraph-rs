import {useCallback, useMemo} from "react";
import {
  NextGraphAuth,
} from "@/types/nextgraph.ts";
import {UserNotification} from "@/.orm/shapes/notification.typings.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {userNotificationDictMapper} from "@/utils/dictMappers.ts";
import {getScope} from "@/utils/nextgraph/ngHelpers.ts";
import {insertObject} from "../../../../../sdk/js/orm";
import {UserNotificationShapeType} from "@/.orm/shapes/notification.shapeTypes.ts";

type NotificationWithoutMeta = Omit<UserNotification, "@id" | "@graph" | "@type">;

function getRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

const bodyPool: string[] = [
  "Alice would like to connect with you",
  "Bob vouched for your React skills",
  "Carol praised your leadership",
  "System: Your profile is now 100% complete",
  "Dave endorsed your TypeScript skills",
];

const now = Date.now();

interface SaveNotificationReturn {
  createNotification: (notification: UserNotification) => Promise<void>;
  generateRandomNotifications: (count: number) => Promise<void>;
}

export const useSaveNotification = (): SaveNotificationReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;

  const typePool: string[] = useMemo(() =>
    [...userNotificationDictMapper.getDictValues("UserNotification", "type")], []);
  const statusPool: string[] = useMemo(() =>
    [...userNotificationDictMapper.getDictValues("UserNotification", "status")], []);

  const createNotification = useCallback(async (notification: NotificationWithoutMeta) => {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    const notificationObj: UserNotification = {
      "@graph": getScope(session.privateStoreId),
      "@id": "",
      "@type": new Set(["did:ng:x:social:notification#Notification"]),
      ...notification
    }

    await insertObject(UserNotificationShapeType, notificationObj);
  }, [session]);

  const generateRandomNotifications = useCallback(
    async (count: number = 10) => {

      for (let i = 0; i < count; i++) {
        const createdAt = new Date(
          now - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7) // last 7 days
        ).toISOString();

        const notification: NotificationWithoutMeta = {
          date: createdAt,
          body: getRandom(bodyPool),
          type: userNotificationDictMapper.appendPrefixToDictValue("UserNotification", "type", getRandom(typePool))!,
          status: userNotificationDictMapper.appendPrefixToDictValue("UserNotification", "status", getRandom(statusPool)),
          seen: false,
          hidden: false,
        };

        await createNotification(notification);
      }
    },
    [createNotification, statusPool, typePool],
  );

  return {
    createNotification,
    generateRandomNotifications,
  }
}