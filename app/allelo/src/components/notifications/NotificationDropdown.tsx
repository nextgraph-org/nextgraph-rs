import { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  Box,
  Typography,
  List,
  Divider,
  Button,
  Chip,
} from '@mui/material';
import {
  UilBell,
  UilEnvelopeCheck,
} from '@iconscout/react-unicons';
import type { Notification, NotificationSummary } from '@/types/notification';
import NotificationItem from '@/components/notifications/NotificationItem';

interface NotificationDropdownProps {
  notifications: Notification[];
  summary: NotificationSummary;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onAcceptVouch: (notificationId: string, vouchId: string) => void;
  onRejectVouch: (notificationId: string, vouchId: string) => void;
  onAcceptPraise: (notificationId: string, praiseId: string) => void;
  onRejectPraise: (notificationId: string, praiseId: string) => void;
  onAssignToRCard: (notificationId: string, rCardId: string) => void;
}

const NotificationDropdown = ({
  notifications,
  summary,
  onMarkAsRead,
  onMarkAllAsRead,
  onAcceptVouch,
  onRejectVouch,
  onAcceptPraise,
  onRejectPraise,
  onAssignToRCard,
}: NotificationDropdownProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'unread'>('all');
  
  const isOpen = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'pending':
        return notification.status === 'pending' && notification.isActionable;
      case 'unread':
        return !notification.isRead;
      default:
        return true;
    }
  });

  const getFilterChipColor = (filterType: string) => {
    return filter === filterType ? 'primary' : 'default';
  };


  return (
    <>
      <IconButton
        size="large"
        color="inherit"
        onClick={handleClick}
        aria-label="notifications"
        aria-expanded={isOpen ? 'true' : undefined}
        aria-haspopup="true"
      >
        <Badge badgeContent={summary.unread} color="error">
          <UilBell size="24" />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          elevation: 8,
          sx: {
            width: 400,
            maxWidth: '90vw',
            maxHeight: '80vh',
            mt: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 20,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
              border: 1,
              borderColor: 'divider',
              borderBottom: 0,
              borderRight: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notifications
            </Typography>
            {summary.unread > 0 && (
              <Button
                size="small"
                startIcon={<UilEnvelopeCheck size="18" />}
                onClick={onMarkAllAsRead}
                sx={{ textTransform: 'none' }}
              >
                Mark all read
              </Button>
            )}
          </Box>

          {/* Summary Stats */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={`${summary.total} Total`}
              sx={{ fontSize: '0.75rem' }}
            />
            {summary.unread > 0 && (
              <Chip
                size="small"
                label={`${summary.unread} Unread`}
                color="error"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {summary.pending > 0 && (
              <Chip
                size="small"
                label={`${summary.pending} Pending`}
                color="warning"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Box>

          {/* Filter Chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label="All"
              onClick={() => setFilter('all')}
              color={getFilterChipColor('all')}
              variant={filter === 'all' ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.75rem', cursor: 'pointer' }}
            />
            <Chip
              size="small"
              label="Pending"
              onClick={() => setFilter('pending')}
              color={getFilterChipColor('pending')}
              variant={filter === 'pending' ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.75rem', cursor: 'pointer' }}
            />
            <Chip
              size="small"
              label="Unread"
              onClick={() => setFilter('unread')}
              color={getFilterChipColor('unread')}
              variant={filter === 'unread' ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.75rem', cursor: 'pointer' }}
            />
          </Box>
        </Box>

        {/* Notification List */}
        <Box sx={{ maxHeight: 400, overflow: 'auto', overflowX: 'hidden' }}>
          {filteredNotifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {filter === 'all' 
                  ? 'No notifications yet'
                  : filter === 'pending'
                  ? 'No pending notifications'
                  : 'No unread notifications'
                }
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredNotifications.map((notification, index) => (
                <Box key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onAcceptVouch={onAcceptVouch}
                    onRejectVouch={onRejectVouch}
                    onAcceptPraise={onAcceptPraise}
                    onRejectPraise={onRejectPraise}
                    onAssignToRCard={onAssignToRCard}
                  />
                  {index < filteredNotifications.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {summary.total > 0 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Button
              variant="text"
              size="small"
              onClick={handleClose}
              sx={{ textTransform: 'none' }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationDropdown;