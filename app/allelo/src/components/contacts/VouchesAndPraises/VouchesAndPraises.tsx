import {Favorite, PersonOutline, Send, VerifiedUser} from "@mui/icons-material"
import {alpha, Box, Button, Card, CardContent, Grid, Typography, useTheme} from "@mui/material"
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";
import {forwardRef, useState, useEffect, useCallback} from "react";
import type {Contact} from "@/types/contact";
import type {Notification} from "@/types/notification";
import {notificationService} from "@/services/notificationService";
import {formatDateDiff} from "@/utils/dateHelpers";

export interface VouchesAndPraisesProps {
  contact?: Contact;
  onInviteToNAO?: () => void;
  refreshTrigger?: number; // Add refresh trigger
}

export const VouchesAndPraises = forwardRef<HTMLDivElement, VouchesAndPraisesProps>(({contact, onInviteToNAO, refreshTrigger}, ref) => {
  const theme = useTheme();
  const [acceptedNotifications, setAcceptedNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAcceptedNotifications = useCallback(async () => {
    if (!contact) return;
    
    setIsLoading(true);
    try {
      const contactId = contact['@id'] || '';
      const accepted = await notificationService.getAcceptedNotificationsByContact(contactId);
      setAcceptedNotifications(accepted);
    } catch (error) {
      console.error('Failed to load accepted notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contact]);

  useEffect(() => {
    loadAcceptedNotifications();
  }, [loadAcceptedNotifications, refreshTrigger]);


  const extractSkillFromMessage = (message: string, type: 'vouch' | 'praise'): string => {
    if (type === 'vouch' && message.includes('vouched for your')) {
      return message.split('vouched for your ')[1]?.split(' skills')[0] || 'skills';
    } else if (type === 'praise' && message.includes('praised your')) {
      return message.split('praised your ')[1]?.split(' skills')[0] || message.split('praised your ')[1] || 'skills';
    }
    return type === 'vouch' ? 'skills' : 'work';
  };

  if (!contact) {
    return null;
  }

  return <Box sx={{mb: 3}} ref={ref}>
    <Typography variant="h6" sx={{fontWeight: 600, mb: 3}}>
      Vouches & Praises
    </Typography>

    <Card variant="outlined">
      <Grid container sx={{minHeight: 300}}>
        {/* What I've Sent */}
        <Grid size={{xs: 12, md: 6}} sx={{borderRight: {md: 1}, borderColor: {md: 'divider'}}}>
          <CardContent sx={{p: 3, height: '100%'}}>
            <Box sx={{display: 'flex', alignItems: 'center', mb: 3}}>
              <Send sx={{mr: 1, color: 'success.main', fontSize: 20}}/>
              <Typography variant="h6" sx={{fontWeight: 600, color: 'success.main'}}>
                Sent to {resolveFrom(contact, 'name')?.value?.split(' ')[0] || 'Contact'}
              </Typography>
            </Box>

            {contact.naoStatus?.value === 'member' ? (
              <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                {/* Vouch item */}
                <Box sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 2
                }}>
                  <VerifiedUser sx={{color: 'primary.main', fontSize: 20, mt: 0.5, flexShrink: 0}}/>
                  <Box sx={{minWidth: 0}}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
                      <Typography variant="body2" sx={{fontWeight: 600}}>React Development</Typography>
                      <Typography variant="caption" color="text.secondary">• 1 week ago</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      "Exceptional React skills and clean code practices."
                    </Typography>
                  </Box>
                </Box>

                {/* Praise items */}
                <Box sx={{display: 'flex', gap: 2, p: 2, bgcolor: alpha('#f8bbd9', 0.15), borderRadius: 2}}>
                  <Favorite sx={{color: '#d81b60', fontSize: 20, mt: 0.5, flexShrink: 0}}/>
                  <Box sx={{minWidth: 0}}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
                      <Typography variant="body2" sx={{fontWeight: 600}}>Leadership</Typography>
                      <Typography variant="caption" color="text.secondary">• 3 days ago</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      "Great leadership during project crunch time!"
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{display: 'flex', gap: 2, p: 2, bgcolor: alpha('#f8bbd9', 0.15), borderRadius: 2}}>
                  <Favorite sx={{color: '#d81b60', fontSize: 20, mt: 0.5, flexShrink: 0}}/>
                  <Box sx={{minWidth: 0}}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
                      <Typography variant="body2" sx={{fontWeight: 600}}>Communication</Typography>
                      <Typography variant="caption" color="text.secondary">• 1 week ago</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      "Always clear and helpful in discussions."
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{textAlign: 'center', py: 4}}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No vouches or praises sent yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Invite {resolveFrom(contact, 'name')?.value?.split(' ')[0] || 'them'} to NAO to start vouching for
                  them!
                </Typography>
              </Box>
            )}

            <Box sx={{mt: 3, pt: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center'}}>
              <Typography variant="caption" color="text.secondary">
                {contact.naoStatus?.value === 'member' ? '1 vouch • 2 praises sent' : 'No vouches sent yet'}
              </Typography>
            </Box>
          </CardContent>
        </Grid>

        {/* What I've Received */}
        <Grid size={{xs: 12, md: 6}}>
          <CardContent sx={{p: 3, height: '100%'}}>
            <Box sx={{display: 'flex', alignItems: 'center', mb: 3}}>
              <Box sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: 1,
                borderColor: '#74796D24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1
              }}>
                <Box sx={{width: 6, height: 6, borderRadius: '50%', bgcolor: 'info.main'}}/>
              </Box>
              <Typography variant="h6" sx={{fontWeight: 600, color: 'info.main'}}>
                Received from {resolveFrom(contact, 'name')?.value?.split(' ')[0] || 'Contact'}
              </Typography>
            </Box>

            {contact.naoStatus?.value === 'member' ? (
              <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                {isLoading ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Loading...
                  </Typography>
                ) : acceptedNotifications.length > 0 ? (
                  acceptedNotifications.map((notification) => (
                    <Box 
                      key={notification.id}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        p: 2,
                        bgcolor: notification.type === 'vouch' 
                          ? alpha(theme.palette.primary.main, 0.04)
                          : alpha('#f8bbd9', 0.15),
                        borderRadius: 2
                      }}
                    >
                      {notification.type === 'vouch' ? (
                        <VerifiedUser sx={{color: 'primary.main', fontSize: 20, mt: 0.5, flexShrink: 0}}/>
                      ) : (
                        <Favorite sx={{color: '#d81b60', fontSize: 20, mt: 0.5, flexShrink: 0}}/>
                      )}
                      <Box sx={{minWidth: 0}}>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
                          <Typography variant="body2" sx={{fontWeight: 600}}>
                            {extractSkillFromMessage(notification.message, notification.type as 'vouch' | 'praise')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {formatDateDiff(notification.updatedAt)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          "{notification.message}"
                        </Typography>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box sx={{textAlign: 'center', py: 4}}>
                    <Typography variant="body2" color="text.secondary">
                      No vouches or praises received yet
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
                gap: 2
              }}>
                <PersonOutline sx={{fontSize: 48, opacity: 0.3, color: 'text.secondary'}}/>
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{maxWidth: 250}}>
                  {contact.naoStatus?.value === 'invited'
                    ? `${resolveFrom(contact, 'name')?.value?.split(' ')[0] || 'Contact'} hasn't joined NAO yet, so they can't send vouches or praises.`
                    : `${resolveFrom(contact, 'name')?.value?.split(' ')[0] || 'Contact'} needs to join NAO before they can send vouches or praises.`
                  }
                </Typography>
                {contact.naoStatus?.value === 'not_invited' && (
                  <Button
                    variant="outlined"
                    startIcon={<Send/>}
                    onClick={onInviteToNAO}
                    size="small"
                    sx={{mt: 1}}
                  >
                    Invite to NAO
                  </Button>
                )}
              </Box>
            )}

            <Box sx={{mt: 3, pt: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center'}}>
              <Typography variant="caption" color="text.secondary">
                {contact.naoStatus?.value === 'member' ? (
                  isLoading ? 'Loading...' : (
                    acceptedNotifications.length === 0 ? 'No vouches or praises received yet' : 
                    `${acceptedNotifications.filter(n => n.type === 'vouch').length} vouch${acceptedNotifications.filter(n => n.type === 'vouch').length !== 1 ? 'es' : ''} • ${acceptedNotifications.filter(n => n.type === 'praise').length} praise${acceptedNotifications.filter(n => n.type === 'praise').length !== 1 ? 's' : ''} received`
                  )
                ) : 'No vouches or praises yet'}
              </Typography>
            </Box>
          </CardContent>
        </Grid>
      </Grid>
    </Card>
  </Box>


});