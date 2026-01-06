import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useCallback, useEffect, useState} from "react";
import {UserNotification} from "@/.orm/shapes/notification.typings.ts";
import {useShape} from "@ng-org/orm/react";
import {UserNotificationShapeType} from "@/.orm/shapes/notification.shapeTypes.ts";
import {getScope} from "@/utils/nextgraph/ngHelpers.ts";

interface GetNotificationsReturn {
  notifications: Set<UserNotification>;
  unseenCount: number;
  markAllAsRead: () => void;
}

export const useGetNotifications = (): GetNotificationsReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;

  const [unseenNotifications, setUnseenNotifications] = useState<UserNotification[]>([]);

  const notifications = useShape(UserNotificationShapeType, getScope(session?.privateStoreId)) as Set<UserNotification>;

  useEffect(() => {
    setUnseenNotifications([...notifications ?? []].filter(notification => !notification.seen));
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    unseenNotifications.forEach(notification => {notification.seen = true})
  }, [unseenNotifications]);


  return {
    notifications,
    unseenCount: unseenNotifications.length,
    markAllAsRead
  };
}