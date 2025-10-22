import { useState, useEffect, forwardRef } from 'react';
import {
  Typography,
  Box,
  Button,
} from '@mui/material';
import { MarkEmailRead } from '@mui/icons-material';
import { notificationService } from '@/services/notificationService';
import type { Notification, NotificationSummary } from '@/types/notification';
import { NotificationsList } from './NotificationsList';

export interface NotificationsPageProps {
  className?: string;
}

export const NotificationsPage = forwardRef<HTMLDivElement, NotificationsPageProps>(
  ({ className }, ref) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notificationSummary, setNotificationSummary] = useState<NotificationSummary>({
      total: 0,
      unread: 0,
      pending: 0,
      byType: { vouch: 0, praise: 0, connection: 0, group_invite: 0, message: 0, system: 0 }
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const loadNotifications = async () => {
        setIsLoading(true);
        try {
          const [notificationData, summaryData] = await Promise.all([
            notificationService.getNotifications('current-user'),
            notificationService.getNotificationSummary('current-user')
          ]);
          setNotifications(notificationData);
          setNotificationSummary(summaryData);
        } catch (error) {
          console.error('Failed to load notifications:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadNotifications();
    }, []);

    const handleMarkAsRead = async (notificationId: string) => {
      try {
        await notificationService.markAsRead(notificationId);
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setNotificationSummary(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
        
        // Dispatch custom event to update notification counter
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    };

    const handleMarkAllAsRead = async () => {
      try {
        await notificationService.markAllAsRead('current-user');
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setNotificationSummary(prev => ({ ...prev, unread: 0 }));
        
        // Dispatch custom event to update notification counter
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    };

    const handleAcceptVouch = async (notificationId: string, rCardIds?: string[]) => {
      try {
        // Find the notification to check if it was unread
        const notification = notifications.find(n => n.id === notificationId);
        const wasUnread = notification && !notification.isRead;
        
        await notificationService.acceptVouch(notificationId, rCardIds);
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { 
            ...n, 
            status: 'accepted', 
            isActionable: false,
            isRead: true,
            metadata: { ...n.metadata, rCardIds }
          } : n)
        );
        setNotificationSummary(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread
        }));
        
        // Dispatch custom event to update notification counter
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (error) {
        console.error('Failed to accept vouch:', error);
      }
    };

    const handleRejectVouch = async (notificationId: string) => {
      try {
        await notificationService.rejectVouch(notificationId);
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, status: 'rejected', isActionable: false } : n)
        );
        setNotificationSummary(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          unread: Math.max(0, prev.unread - 1)
        }));
        
        // Dispatch custom event to update notification counter
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (error) {
        console.error('Failed to reject vouch:', error);
      }
    };

    const handleAcceptPraise = async (notificationId: string, rCardIds?: string[]) => {
      try {
        await notificationService.acceptPraise(notificationId, rCardIds);
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { 
            ...n, 
            status: 'accepted', 
            isActionable: false,
            metadata: { ...n.metadata, rCardIds }
          } : n)
        );
        setNotificationSummary(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          unread: Math.max(0, prev.unread - 1)
        }));
        
        // Dispatch custom event to update notification counter
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (error) {
        console.error('Failed to accept praise:', error);
      }
    };

    const handleRejectPraise = async (notificationId: string) => {
      try {
        await notificationService.rejectPraise(notificationId);
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, status: 'rejected', isActionable: false } : n)
        );
        setNotificationSummary(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          unread: Math.max(0, prev.unread - 1)
        }));
        
        // Dispatch custom event to update notification counter
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (error) {
        console.error('Failed to reject praise:', error);
      }
    };

    const handleAcceptConnection = async (notificationId: string, selectedRCardId: string) => {
      try {
        await notificationService.acceptConnection(notificationId, selectedRCardId);
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, status: 'accepted', isActionable: false } : n)
        );
        setNotificationSummary(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          unread: Math.max(0, prev.unread - 1)
        }));
        
        // Dispatch custom event to update notification counter
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (error) {
        console.error('Failed to accept connection:', error);
      }
    };

    const handleRejectConnection = async (notificationId: string) => {
      try {
        await notificationService.rejectConnection(notificationId);
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, status: 'rejected', isActionable: false } : n)
        );
        setNotificationSummary(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          unread: Math.max(0, prev.unread - 1)
        }));
        
        // Dispatch custom event to update notification counter
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (error) {
        console.error('Failed to reject connection:', error);
      }
    };

    return (
      <Box 
        ref={ref}
        className={className}
        sx={{ 
          width: '100%',
          maxWidth: { xs: '100vw', md: '100%' },
          overflow: 'hidden',
          boxSizing: 'border-box',
          p: { xs: '10px', md: 0 },
          mx: { xs: 0, md: 'auto' }
        }}
      >
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: { xs: 1, md: 1 },
          width: '100%',
          overflow: 'hidden',
          minWidth: 0
        }}>
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 700, 
                mb: { xs: 0, md: 0 },
                fontSize: { xs: '1.5rem', md: '2.125rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              Notifications
            </Typography>
            {notificationSummary.unread > 0 && (
              <Typography variant="body2" color="text.secondary">
                You have {notificationSummary.unread} unread notification{notificationSummary.unread !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
          {notificationSummary.unread > 0 && (
            <Button
              variant="outlined"
              startIcon={<MarkEmailRead />}
              onClick={handleMarkAllAsRead}
              sx={{ 
                borderRadius: 2,
                fontSize: { xs: '0.75rem', md: '0.875rem' },
                px: { xs: 1, md: 2 },
                py: { xs: 0.5, md: 1 }
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
          <Box sx={{ p: { xs: 0, md: 0 } }}>
            <NotificationsList
              notifications={notifications}
              isLoading={isLoading}
              onMarkAsRead={handleMarkAsRead}
              onAcceptVouch={handleAcceptVouch}
              onRejectVouch={handleRejectVouch}
              onAcceptPraise={handleAcceptPraise}
              onRejectPraise={handleRejectPraise}
              onAcceptConnection={handleAcceptConnection}
              onRejectConnection={handleRejectConnection}
            />
          </Box>
        </Box>
      </Box>
    );
  }
);

NotificationsPage.displayName = 'NotificationsPage';