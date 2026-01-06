import {CSSProperties, forwardRef, useCallback, useMemo} from 'react';
import {alpha, Avatar, Box, Chip, Divider, IconButton, Typography, useTheme} from "@mui/material";
import {
  UilBell,
  UilCheckCircle,
  UilClock,
  UilHeart, UilSetting,
  UilShieldCheck,
  UilTimes,
  UilUsersAlt
} from "@iconscout/react-unicons";
import {formatDate} from "@/utils/dateHelpers.ts";
import {UserNotification} from "@/.orm/shapes/notification.typings.ts";
import {userNotificationDictMapper} from "@/utils/dictMappers.ts";

interface NotificationItemProps {
  notification: UserNotification;
  showDivider?: boolean;
}

interface NotificationAction {
  title: string;
  callback: () => void;
  style?: CSSProperties;
}

export const NotificationItem = forwardRef<HTMLLIElement, NotificationItemProps>(
  ({
     notification,
     showDivider = true
   }, ref) => {

    const theme = useTheme();

    const notificationId = notification["@id"];

    const notificationStatus = userNotificationDictMapper.removePrefix(notification?.status);
    const notificationType = userNotificationDictMapper.removePrefix(notification?.type);

    const getNotificationIcon = useCallback(() => {
      switch (notificationType) {
        case 'Vouch':
          return <UilShieldCheck size="20" color={theme.palette.primary.main}/>;
        case 'Connection':
          return <UilUsersAlt size="20" color={theme.palette.info.main}/>;
        case 'Praise':
          return <UilHeart size="20" color="#d81b60"/>;
        case 'System':
          return <UilSetting size="20" color={theme.palette.warning.main}/>;
        default:
          return <UilBell size="20"/>;
      }
    }, [notificationType, theme]);

    const actions = useMemo<NotificationAction[]>(() => {
      switch (notificationType) {
        case "Connection":
          return notification.status === "did:ng:x:social:notification:status#Pending" ? [
            {
              title: "Reject",
              callback: () => {
                notification.status = "did:ng:x:social:notification:status#Rejected"
              },
              style: {
                border: '1px solid',
                borderColor: theme.palette.grey[400],
                backgroundColor: 'transparent',
                color: theme.palette.text.primary,
              }
            },
            {
              title: "Accept",
              callback: () => {
                notification.status = "did:ng:x:social:notification:status#Accepted"
              },
              style: {
                border: 'none',
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
              }
            },
          ] : [];
        default:
          return [];
      }
    }, [notification, notificationType, theme]);

    return (
      <Box key={notificationId} ref={ref}>
        <Box sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          py: 2,
          backgroundColor: notification.seen ? 'transparent' : alpha(theme.palette.primary.main, 0.02),
          borderRadius: 1,
          position: 'relative'
        }}>
          {/* Notification Icon */}
          <Box sx={{flexShrink: 0, mt: 0.5}}>
            {getNotificationIcon()}
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
            onClick={() => console.log(notificationId)}
          >
            {/* Sender Info */}
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
              <Avatar
                // src={notification.fromUserAvatar}
                // alt={notification.fromUserName}
                sx={{width: 24, height: 24, fontSize: '0.75rem'}}
              >
                {"notification.fromUserName?.charAt(0)"}
              </Avatar>
              <Typography variant="subtitle2" sx={{fontWeight: 600}}>
                {"notification.fromUserName"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(notification.date, {month: "short"})}
              </Typography>
            </Box>

            {/* Message */}
            <Typography variant="body2" sx={{mb: 1, lineHeight: 1.5}}>
              {notification.body}
            </Typography>

            {/* Status and Actions */}
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap'}}>
              {notificationStatus && (
                <Chip
                  icon={notificationStatus === 'Accepted' ? <UilCheckCircle size="16"/> : <UilClock size="16"/>}
                  label={notificationStatus}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.75rem',
                    height: 20,
                    textTransform: 'capitalize',
                    ...(notificationStatus === 'Accepted' && {
                      backgroundColor: alpha(theme.palette.success.main, 0.08),
                      borderColor: alpha(theme.palette.success.main, 0.2),
                      color: 'success.main'
                    })
                  }}
                />
              )}

              {/* Action Buttons */}
              {actions.length > 0 && (
                <Box sx={{display: 'flex', gap: 1, ml: 'auto'}}>
                  {actions.map(action => (
                    <button
                      onClick={action.callback}
                      style={{
                        minWidth: 60,
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        ...action.style
                      }}
                    >
                      {action.title}
                    </button>
                  ))}
                </Box>
              )}

            </Box>
          </Box>

          {/* Unread indicator and Mark as Read Button */}
          <Box sx={{display: 'flex', alignItems: 'flex-start', gap: 1, flexShrink: 0}}>
            {!notification.seen && (
              <>
                <Box sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  mt: 1
                }}/>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    notification.seen = true;
                  }}
                >
                  <UilTimes size="16"/>
                </IconButton>
              </>
            )}
          </Box>
        </Box>
        {
          showDivider && <Divider/>
        }
      </Box>
    )

  }
);

NotificationItem.displayName = 'NotificationItem';