import { forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Divider,
  alpha,
  useTheme,
  Avatar,
  Chip,
  IconButton,
} from '@mui/material';
import {
  VerifiedUser,
  Favorite,
  Group,
  Message,
  Settings,
  Notifications,
  CheckCircle,
  Schedule,
  Close,
} from '@mui/icons-material';
import type { Notification } from '@/types/notification';
import {formatDate} from "@/utils/dateHelpers";
import { RCardSelectionModal } from '../RCardSelectionModal';

export interface NotificationsListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (notificationId: string) => void;
  onAcceptVouch: (notificationId: string, rCardIds?: string[]) => void;
  onRejectVouch: (notificationId: string) => void;
  onAcceptPraise: (notificationId: string, rCardIds?: string[]) => void;
  onRejectPraise: (notificationId: string) => void;
  onAcceptConnection: (notificationId: string, selectedRCardId: string) => void;
  onRejectConnection: (notificationId: string) => void;
}

export const NotificationsList = forwardRef<HTMLDivElement, NotificationsListProps>(
  ({ 
    notifications, 
    isLoading, 
    onMarkAsRead,
    onAcceptVouch,
    onRejectVouch,
    onAcceptPraise,
    onRejectPraise,
    onAcceptConnection,
    onRejectConnection,
  }, ref) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [rCardModalOpen, setRCardModalOpen] = useState(false);
    const [pendingConnectionId, setPendingConnectionId] = useState<string | null>(null);
    const [pendingConnectionName, setPendingConnectionName] = useState<string | null>(null);
    const [modalType, setModalType] = useState<'connection' | 'vouch' | 'praise'>('connection');
    const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);

    const handleOpenRCardModal = (notificationId: string, contactName?: string, type: 'connection' | 'vouch' | 'praise' = 'connection') => {
      setPendingNotificationId(notificationId);
      setPendingConnectionName(contactName || null);
      setModalType(type);
      setRCardModalOpen(true);
      
      if (type === 'connection') {
        setPendingConnectionId(notificationId);
      }
    };

    const handleRCardSelect = (rCardIds: string[]) => {
      if (modalType === 'connection' && pendingConnectionId) {
        onAcceptConnection(pendingConnectionId, rCardIds[0]); // Connection still uses single selection
        setPendingConnectionId(null);
      } else if (modalType === 'vouch' && pendingNotificationId) {
        onAcceptVouch(pendingNotificationId, rCardIds);
      } else if (modalType === 'praise' && pendingNotificationId) {
        onAcceptPraise(pendingNotificationId, rCardIds);
      }
      setPendingNotificationId(null);
      setPendingConnectionName(null);
    };

    const handleNotificationClick = (notification: Notification) => {
      if (notification.metadata?.contactId) {
        navigate(`/contacts/${notification.metadata.contactId}`, { state: { from: 'notifications' } });
      } else if (notification.fromUserId) {
        navigate(`/contacts/${notification.fromUserId}`, { state: { from: 'notifications' } });
      }
    };

    const getNotificationIcon = (type: string) => {
      switch (type) {
        case 'vouch':
          return <VerifiedUser sx={{ fontSize: 20, color: 'primary.main' }} />;
        case 'connection':
          return <Group sx={{ fontSize: 20, color: 'info.main' }} />;
        case 'praise':
          return <Favorite sx={{ fontSize: 20, color: '#d81b60' }} />;
        case 'group_invite':
          return <Group sx={{ fontSize: 20, color: 'success.main' }} />;
        case 'message':
          return <Message sx={{ fontSize: 20, color: 'info.main' }} />;
        case 'system':
          return <Settings sx={{ fontSize: 20, color: 'warning.main' }} />;
        default:
          return <Notifications sx={{ fontSize: 20 }} />;
      }
    };

    if (isLoading) {
      return (
        <Box ref={ref} sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Loading notifications...
          </Typography>
        </Box>
      );
    }

    if (notifications.length === 0) {
      return (
        <Box ref={ref} sx={{ textAlign: 'center', py: 8 }}>
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
        <Box ref={ref} sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {notifications.map((notification, index) => (
            <Box key={notification.id}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 2, 
              py: 2,
              backgroundColor: notification.isRead ? 'transparent' : alpha(theme.palette.primary.main, 0.02),
              borderRadius: 1,
              position: 'relative'
            }}>
              {/* Notification Icon */}
              <Box sx={{ flexShrink: 0, mt: 0.5 }}>
                {getNotificationIcon(notification.type)}
              </Box>

              {/* Main Content */}
              <Box 
                sx={{ 
                  flexGrow: 1, 
                  minWidth: 0,
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8,
                  }
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Sender Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar
                    src={notification.fromUserAvatar}
                    alt={notification.fromUserName}
                    sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                  >
                    {notification.fromUserName?.charAt(0)}
                  </Avatar>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {notification.fromUserName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(notification.createdAt, {month: "short"})}
                  </Typography>
                </Box>

                {/* Message */}
                <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
                  {notification.message}
                </Typography>

                {/* Status and Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {notification.status && (
                    <Chip
                      icon={notification.status === 'accepted' ? <CheckCircle /> : <Schedule />}
                      label={notification.status}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        height: 20,
                        textTransform: 'capitalize',
                        ...(notification.status === 'accepted' && {
                          backgroundColor: alpha(theme.palette.success.main, 0.08),
                          borderColor: alpha(theme.palette.success.main, 0.2),
                          color: 'success.main'
                        })
                      }}
                    />
                  )}
                  
                  {/* Show assigned rCards for accepted vouches/praises */}
                  {notification.status === 'accepted' && notification.metadata?.rCardIds && notification.metadata.rCardIds.length > 0 && (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>
                        •
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Assigned to:
                      </Typography>
                      {notification.metadata.rCardIds.map((rCardId) => {
                        const cardName = rCardId.replace('rcard-', '').charAt(0).toUpperCase() + 
                                       rCardId.replace('rcard-', '').slice(1);
                        return (
                          <Chip
                            key={rCardId}
                            label={cardName}
                            size="small"
                            variant="filled"
                            sx={{
                              fontSize: '0.7rem',
                              height: 18,
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              color: 'primary.main'
                            }}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Action Buttons */}
                  {notification.isActionable && notification.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                      {notification.type === 'vouch' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRejectVouch(notification.id);
                            }}
                            style={{
                              minWidth: 60,
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              border: '1px solid',
                              borderColor: theme.palette.grey[400],
                              borderRadius: 4,
                              backgroundColor: 'transparent',
                              color: theme.palette.text.primary,
                              cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRCardModal(notification.id, notification.fromUserName, 'vouch');
                            }}
                            style={{
                              minWidth: 60,
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              border: 'none',
                              borderRadius: 4,
                              backgroundColor: theme.palette.primary.main,
                              color: theme.palette.primary.contrastText,
                              cursor: 'pointer'
                            }}
                          >
                            Accept
                          </button>
                        </>
                      )}
                      {notification.type === 'praise' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRejectPraise(notification.id);
                            }}
                            style={{
                              minWidth: 60,
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              border: '1px solid',
                              borderColor: theme.palette.grey[400],
                              borderRadius: 4,
                              backgroundColor: 'transparent',
                              color: theme.palette.text.primary,
                              cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRCardModal(notification.id, notification.fromUserName, 'praise');
                            }}
                            style={{
                              minWidth: 60,
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              border: 'none',
                              borderRadius: 4,
                              backgroundColor: theme.palette.primary.main,
                              color: theme.palette.primary.contrastText,
                              cursor: 'pointer'
                            }}
                          >
                            Accept
                          </button>
                        </>
                      )}
                      {notification.type === 'connection' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRejectConnection(notification.id);
                            }}
                            style={{
                              minWidth: 60,
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              border: '1px solid',
                              borderColor: theme.palette.grey[400],
                              borderRadius: 4,
                              backgroundColor: 'transparent',
                              color: theme.palette.text.primary,
                              cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRCardModal(notification.id, notification.fromUserName);
                            }}
                            style={{
                              minWidth: 60,
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              border: 'none',
                              borderRadius: 4,
                              backgroundColor: theme.palette.primary.main,
                              color: theme.palette.primary.contrastText,
                              cursor: 'pointer'
                            }}
                          >
                            Accept
                          </button>
                        </>
                      )}
                    </Box>
                  )}

                </Box>
              </Box>

              {/* Unread indicator and Mark as Read Button */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexShrink: 0 }}>
                {!notification.isRead && (
                  <>
                    <Box sx={{ 
                      width: 6, 
                      height: 6, 
                      borderRadius: '50%', 
                      backgroundColor: 'primary.main',
                      mt: 1
                    }} />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notification.id);
                      }}
                    >
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  </>
                )}
              </Box>
            </Box>
            {index < notifications.length - 1 && <Divider />}
          </Box>
        ))}
      </Box>

      {/* RCard Selection Modal */}
      <RCardSelectionModal
        open={rCardModalOpen}
        onClose={() => {
          setRCardModalOpen(false);
          setPendingConnectionId(null);
          setPendingConnectionName(null);
          setPendingNotificationId(null);
        }}
        onSelect={handleRCardSelect}
        contactName={pendingConnectionName || undefined}
        isVouch={modalType === 'vouch' || modalType === 'praise'}
        multiSelect={modalType !== 'connection'}
      />
    </>
  );
});

NotificationsList.displayName = 'NotificationsList';