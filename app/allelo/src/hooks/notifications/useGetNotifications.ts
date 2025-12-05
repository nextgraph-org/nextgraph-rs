import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useCallback, useEffect, useMemo, useState} from "react";
import {UserNotification} from "@/.orm/shapes/notification.typings.ts";

interface GetNotificationsReturn {
  notifications: Set<UserNotification> | undefined;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  totalCount: number;
  unseenNotifications: UserNotification[];
  error: Error | null;
  reloadNotifications: () => void;
}

export const useGetNotifications = (limit: number = 10): GetNotificationsReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [unseenNotifications, setUnseenNotifications] = useState<UserNotification[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // const notifications = useShape(UserNotificationShapeType);

  const notifications = useMemo<Set<UserNotification>>(() => new Set([]), []);

  const hasMore = useMemo(() => (notifications?.size ?? 0) < totalCount, [notifications, totalCount]);

  useEffect(() => {
    setUnseenNotifications([...notifications?.values() ?? []].filter(notification => !notification.seen));
  }, [notifications]);

  const loadNotifications = useCallback((page: number) => {
    // (async () => {
    //   try {
    //     setIsLoading(true);
    //     const offset = page * limit;
    //     const notificationsResult = await notificationService.getNotificationIDs(session, limit, offset)
    //     if (notificationsResult.results) {
    //       setNotificationIDs(notificationsResult.results.bindings!.map(
    //         (binding) => binding.notificationUri.value
    //       ));
    //     }
    //
    //     const countResult = await notificationService.getNotificationsCount(session);
    //
    //     setTotalCount((countResult.results?.bindings ?? [])[0].totalCount.value as unknown as number);
    //     setError(null);
    //   } catch (err) {
    //     const errorInstance = err instanceof Error ? err : new Error(`Failed to load notifications`);
    //     setError(errorInstance);
    //     console.error(errorInstance.message);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // })();
        setIsLoading(false);
  }, [limit, session]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    loadNotifications(nextPage);
    setCurrentPage(nextPage);
    setIsLoadingMore(false);
  }, [currentPage, hasMore, loadNotifications, isLoadingMore]);

  const reloadNotifications = useCallback(() => {
    setCurrentPage(0);
    setIsLoading(true);
    loadNotifications(0);
  }, [loadNotifications]);


  useEffect(() => {
    reloadNotifications();
  }, [reloadNotifications]);

  return {
    notifications,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    totalCount,
    error,
    reloadNotifications,
    unseenNotifications,
  };
}