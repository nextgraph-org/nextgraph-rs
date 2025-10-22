import { forwardRef } from 'react';
import {
  ListItem,
  Box,
  Avatar,
  Typography,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { ThumbUp, StarBorder } from '@mui/icons-material';
import { NotificationActions } from './NotificationActions';
import type { NotificationItemProps } from './types';

export const NotificationItem = forwardRef<HTMLLIElement, NotificationItemProps>(
  ({ 
    notification,
    onMarkAsRead,
    onAcceptVouch,
    onRejectVouch,
    onAcceptPraise,
    onRejectPraise,
    onAssignToRCard,
  }, ref) => {
    const theme = useTheme();

    const getNotificationIcon = () => {
      switch (notification.type) {
        case 'vouch':
          return <ThumbUp sx={{ color: 'primary.main' }} />;
        case 'praise':
          return <StarBorder sx={{ color: 'warning.main' }} />;
        default:
          return null;
      }
    };

    const getStatusChip = () => {
      switch (notification.status) {
        case 'pending':
          return <Chip label="Pending" size="small" color="warning" />;
        case 'accepted':
          return <Chip label="Accepted" size="small" color="success" />;
        case 'rejected':
          return <Chip label="Declined" size="small" color="error" />;
        case 'completed':
          return <Chip label="Assigned" size="small" color="info" />;
        default:
          return null;
      }
    };

    return (
      <ListItem
        ref={ref}
        sx={{
          p: 2,
          borderLeft: 4,
          borderLeftColor: notification.isRead ? 'transparent' : 'primary.main',
          backgroundColor: notification.isRead 
            ? 'transparent' 
            : alpha(theme.palette.primary.main, 0.02),
          '&:hover': {
            backgroundColor: alpha(theme.palette.action.hover, 0.5),
          },
        }}
      >
        <Box sx={{ display: 'flex', width: '100%', gap: 2, minWidth: 0 }}>
          {/* Avatar and Icon */}
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={notification.fromUserAvatar}
              alt={notification.fromUserName}
              sx={{ width: 48, height: 48 }}
            >
              {notification.fromUserName?.charAt(0) || 'N'}
            </Avatar>
            {getNotificationIcon() && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  backgroundColor: 'background.paper',
                  borderRadius: '50%',
                  p: 0.5,
                  border: 2,
                  borderColor: 'background.paper',
                }}
              >
                {getNotificationIcon()}
              </Box>
            )}
          </Box>

          {/* Content */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2, flexGrow: 1, minWidth: 0 }}>
                {notification.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                {getStatusChip()}
              </Box>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ 
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {notification.message}
            </Typography>

            <NotificationActions
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onAcceptVouch={onAcceptVouch}
              onRejectVouch={onRejectVouch}
              onAcceptPraise={onAcceptPraise}
              onRejectPraise={onRejectPraise}
              onAssignToRCard={onAssignToRCard}
            />
          </Box>
        </Box>
      </ListItem>
    );
  }
);

NotificationItem.displayName = 'NotificationItem';