import {forwardRef} from 'react';
import {
  Typography,
  Box,
} from '@mui/material';
import {NotificationItem} from "@/components/notifications/NotificationItem/NotificationItem.tsx";
import {UserNotification} from "@/.orm/shapes/notification.typings.ts";

export interface NotificationsListProps {
  notifications: Set<UserNotification> | undefined;
  handleMarkAsRead: (notificationId: string) => void;
  isLoading: boolean;
}

export const NotificationsList = forwardRef<HTMLDivElement, NotificationsListProps>(
  ({
     notifications,
     handleMarkAsRead,
     isLoading,
   }, ref) => {
    if (isLoading) {
      return (
        <Box ref={ref} sx={{textAlign: 'center', py: 8}}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Loading notifications...
          </Typography>
        </Box>
      );
    }

    if ((notifications?.size ?? 0) === 0) {
      return (
        <Box ref={ref} sx={{textAlign: 'center', py: 8}}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No notifications yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You'll see notifications here when you receive vouches, praises, and other updates.
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <Box ref={ref} sx={{display: 'flex', flexDirection: 'column', gap: 0}}>
          {[...(notifications?.values() ?? [])].map((notification) => <NotificationItem
            key={notification["@id"]}
            notification={notification}
            handleMarkAsRead={handleMarkAsRead}
          />)}
        </Box>

      </>
    );
  });

NotificationsList.displayName = 'NotificationsList';