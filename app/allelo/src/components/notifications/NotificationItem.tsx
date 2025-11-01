import { useState } from 'react';
import {
  ListItem,
  Box,
  Avatar,
  Typography,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  useTheme,
  alpha,
} from '@mui/material';
import {
  UilThumbsUp,
  UilStar,
  UilCheckCircle,
  UilTimesCircle,
  UilClipboardAlt,
  UilEllipsisV,
  UilBuilding,
  UilUser,
  UilUsersAlt,
  UilKid,
  UilHeart,
  UilHome,
  UilMapMarker,
  UilGlobe,
} from '@iconscout/react-unicons';
import type { Notification } from '@/types/notification';
import { DEFAULT_RCARDS } from '@/types/notification';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  onAcceptVouch: (notificationId: string, vouchId: string) => void;
  onRejectVouch: (notificationId: string, vouchId: string) => void;
  onAcceptPraise: (notificationId: string, praiseId: string) => void;
  onRejectPraise: (notificationId: string, praiseId: string) => void;
  onAssignToRCard: (notificationId: string, rCardId: string) => void;
}

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onAcceptVouch,
  onRejectVouch,
  onAcceptPraise,
  onRejectPraise,
  onAssignToRCard,
}: NotificationItemProps) => {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRCard, setSelectedRCard] = useState('');

  const isMenuOpen = Boolean(menuAnchor);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleAccept = () => {
    if (notification.type === 'vouch' && notification.metadata?.vouchId) {
      onAcceptVouch(notification.id, notification.metadata.vouchId);
    } else if (notification.type === 'praise' && notification.metadata?.praiseId) {
      onAcceptPraise(notification.id, notification.metadata.praiseId);
    }
    handleMenuClose();
  };

  const handleReject = () => {
    if (notification.type === 'vouch' && notification.metadata?.vouchId) {
      onRejectVouch(notification.id, notification.metadata.vouchId);
    } else if (notification.type === 'praise' && notification.metadata?.praiseId) {
      onRejectPraise(notification.id, notification.metadata.praiseId);
    }
    handleMenuClose();
  };

  const handleAssignClick = () => {
    setShowAssignDialog(true);
    handleMenuClose();
  };

  const handleAssignSubmit = () => {
    if (selectedRCard) {
      onAssignToRCard(notification.id, selectedRCard);
      setShowAssignDialog(false);
      setSelectedRCard('');
    }
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(notification.id);
    handleMenuClose();
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'vouch':
        return <UilThumbsUp size="20" color={theme.palette.primary.main} />;
      case 'praise':
        return <UilStar size="20" color={theme.palette.warning.main} />;
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

  const getRCardIcon = (iconName: string) => {
    switch (iconName) {
      case 'Business':
        return <UilBuilding size="20" />;
      case 'PersonOutline':
        return <UilUser size="20" />;
      case 'Groups':
        return <UilUsersAlt size="20" />;
      case 'FamilyRestroom':
        return <UilKid size="20" />;
      case 'Favorite':
        return <UilHeart size="20" />;
      case 'Home':
        return <UilHome size="20" />;
      case 'LocationOn':
        return <UilMapMarker size="20" />;
      case 'Public':
        return <UilGlobe size="20" />;
      default:
        return <UilUser size="20" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <>
      <ListItem
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
                <IconButton size="small" onClick={handleMenuClick}>
                  <UilEllipsisV size="20" />
                </IconButton>
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

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {formatTimeAgo(notification.createdAt)}
              </Typography>

              {/* Action Buttons */}
              {notification.isActionable && notification.status === 'pending' && (
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<UilTimesCircle size="16" />}
                    onClick={handleReject}
                    sx={{ textTransform: 'none', minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    Decline
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<UilCheckCircle size="16" />}
                    onClick={handleAccept}
                    sx={{ textTransform: 'none', minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    Accept
                  </Button>
                </Box>
              )}

              {notification.status === 'accepted' && !notification.metadata?.rCardId && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<UilClipboardAlt size="16" />}
                  onClick={handleAssignClick}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  Assign to rCard
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </ListItem>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={isMenuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 160 }
        }}
      >
        {!notification.isRead && (
          <MenuItem onClick={handleMarkAsRead}>
            Mark as read
          </MenuItem>
        )}
        {notification.status === 'accepted' && !notification.metadata?.rCardId && (
          <MenuItem onClick={handleAssignClick}>
            Assign to rCard
          </MenuItem>
        )}
        {notification.isActionable && notification.status === 'pending' && (
          <>
            <MenuItem onClick={handleAccept}>Accept</MenuItem>
            <MenuItem onClick={handleReject}>Decline</MenuItem>
          </>
        )}
      </Menu>

      {/* Assign to rCard Dialog */}
      <Dialog 
        open={showAssignDialog} 
        onClose={() => setShowAssignDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Assign to rCard
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which rCard category to assign this {notification.type} to. This helps organize your connections and endorsements.
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>Select rCard</InputLabel>
            <Select
              value={selectedRCard}
              label="Select rCard"
              onChange={(e) => setSelectedRCard(e.target.value)}
            >
              {DEFAULT_RCARDS.map((rCard, index) => (
                <MenuItem key={index} value={`default-${index}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getRCardIcon(rCard.icon || 'PersonOutline')}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {rCard.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rCard.description}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAssignDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAssignSubmit} 
            variant="contained"
            disabled={!selectedRCard}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationItem;