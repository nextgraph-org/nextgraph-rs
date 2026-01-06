import {forwardRef} from 'react';
import {
  Typography,
  Box,
  Button,
} from '@mui/material';
import {UilEnvelopeCheck} from '@iconscout/react-unicons';
import {NotificationsList} from './NotificationsList';
import {useSaveNotification} from "@/hooks/notifications/useSaveNotification.ts";
import {useGetNotifications} from "@/hooks/notifications/useGetNotifications.ts";

export interface NotificationsPageProps {
  className?: string;
}

export const NotificationsPage = forwardRef<HTMLDivElement, NotificationsPageProps>(
  ({className}, ref) => {
    const {generateRandomNotifications} = useSaveNotification();
    const {notifications, unseenCount, markAllAsRead} = useGetNotifications();

    return (
      <Box
        ref={ref}
        className={className}
        sx={{
          width: '100%',
          maxWidth: {xs: '100vw', md: '100%'},
          overflow: 'hidden',
          boxSizing: 'border-box',
          p: {xs: '10px', md: 0},
          mx: {xs: 0, md: 'auto'}
        }}
      >
        {/* Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: {xs: 1, md: 1},
          width: '100%',
          overflow: 'hidden',
          minWidth: 0
        }}>
          <Box sx={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: {xs: 0, md: 0},
                fontSize: {xs: '1.5rem', md: '2.125rem'},
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              Notifications
            </Typography>
            <Button
              variant="outlined"
              startIcon={<UilEnvelopeCheck size="20"/>}
              onClick={() => generateRandomNotifications(2)}
              sx={{
                borderRadius: 2,
                fontSize: {xs: '0.75rem', md: '0.875rem'},
                px: {xs: 1, md: 2},
                py: {xs: 0.5, md: 1}
              }}
            >
              Generate random notifications
            </Button>
            {unseenCount > 0 && (
              <Typography variant="body2" color="text.secondary">
                You have {unseenCount} unread notification{unseenCount !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
          {unseenCount > 0 && (
            <Button
              variant="outlined"
              startIcon={<UilEnvelopeCheck size="20"/>}
              onClick={markAllAsRead}
              sx={{
                borderRadius: 2,
                fontSize: {xs: '0.75rem', md: '0.875rem'},
                px: {xs: 1, md: 2},
                py: {xs: 0.5, md: 1}
              }}
            >
              Mark All Read
            </Button>
          )}
        </Box>

        {/* Notifications List */}
        <Box sx={{
          width: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <Box sx={{p: {xs: 0, md: 0}}}>
            <NotificationsList
              notifications={notifications}
            />
          </Box>
        </Box>
      </Box>
    );
  }
);

NotificationsPage.displayName = 'NotificationsPage';