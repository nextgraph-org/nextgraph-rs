import { useState, forwardRef } from 'react';
import {
  Box,
  Button,
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
  Typography,
} from '@mui/material';
import {
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
import { DEFAULT_RCARDS } from '@/types/notification';
import type { Notification } from '@/types/notification';

export interface NotificationActionsProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  onAcceptVouch: (notificationId: string, vouchId: string) => void;
  onRejectVouch: (notificationId: string, vouchId: string) => void;
  onAcceptPraise: (notificationId: string, praiseId: string) => void;
  onRejectPraise: (notificationId: string, praiseId: string) => void;
  onAssignToRCard: (notificationId: string, rCardId: string) => void;
}

export const NotificationActions = forwardRef<HTMLDivElement, NotificationActionsProps>(
  ({ 
    notification,
    onMarkAsRead,
    onAcceptVouch,
    onRejectVouch,
    onAcceptPraise,
    onRejectPraise,
    onAssignToRCard,
  }, ref) => {
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

    return (
      <Box ref={ref}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {new Intl.DateTimeFormat('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              day: 'numeric',
              month: 'short'
            }).format(notification.createdAt)}
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

          <IconButton size="small" onClick={handleMenuClick}>
            <UilEllipsisV size="20" />
          </IconButton>
        </Box>

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
          {notification.isActionable && notification.status === 'pending' && [
            <MenuItem key="accept" onClick={handleAccept}>Accept</MenuItem>,
            <MenuItem key="decline" onClick={handleReject}>Decline</MenuItem>
          ]}
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
      </Box>
    );
  }
);

NotificationActions.displayName = 'NotificationActions';