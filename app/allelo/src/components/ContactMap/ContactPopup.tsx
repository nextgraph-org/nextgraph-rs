import {Box, Typography, IconButton, useTheme, useMediaQuery} from '@mui/material';
import {
  UilUser as Person,
  UilPhone as Phone,
  UilEnvelope as Message
} from '@iconscout/react-unicons';
import type {ContactPopupProps} from './types';
import {resolveFrom} from '@/utils/socialContact/contactUtils.ts';
import {defaultTemplates, renderTemplate} from "@/utils/templateRenderer.ts";
import {ContactCardAvatar} from "@/components/contacts/ContactCardAvatar";

export const ContactPopup = ({contact, onContactClick}: ContactPopupProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const phoneNumber = resolveFrom(contact, 'phoneNumber');
  const name = resolveFrom(contact, 'name');
  const organization = resolveFrom(contact, 'organization');

  const displayName = name?.value || renderTemplate(defaultTemplates.contactName, name);

  const handleCall = () => {
    if (phoneNumber?.value) {
      window.location.href = `tel:${phoneNumber.value}`;
    }
  };

  const handleMessage = () => {
    console.log('Message contact:', displayName, 'ID:', contact['@id']);
    // Navigate to messages with contact ID
    window.location.href = `/messages?contactId=${contact['@id']}`;
  };

  return (
    <Box sx={{
      width: '100%',
      maxWidth: 360,
      padding: isMobile ? '8px 8px 12px 8px' : '12px 12px 16px 12px',
      backgroundColor: '#fff'
    }}>
      {/* Header with photo and info */}
      <Box sx={{display: 'flex', alignItems: 'flex-start', gap: isMobile ? 1 : 2, mb: 2}}>
        <ContactCardAvatar
          contact={contact}
          initial={displayName}
          size={{xs: 60, sm: 100}}
        >
        </ContactCardAvatar>

        <Box sx={{flex: 1, minWidth: 0}}>
          <Typography variant={isMobile ? "body1" : "h6"} sx={{
            fontWeight: 600,
            mb: 0.5,
            lineHeight: 1.2,
            fontSize: isMobile ? '1rem' : undefined
          }}>
            {displayName}
          </Typography>

          {(organization?.position || organization?.value) && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                margin: '0.5em 0',
                marginLeft: 0
              }}
            >
              {organization?.position}{organization?.value && ` at ${organization.value}`}
            </Typography>
          )}

          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '12px',
            px: 1.5,
            py: 0.5
          }}>
            <Typography variant="caption" sx={{
              color: '#2e7d32',
              fontWeight: 500,
              fontSize: '0.75rem'
            }}>
              {'Contact'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* HR line separator */}
      <Box sx={{
        height: '1px',
        backgroundColor: 'rgba(0,0,0,0.1)',
        mb: 4,
        mx: -1
      }}/>

      {/* Action buttons - no labels, dark green, more spaced out */}
      <Box sx={{display: 'flex', justifyContent: 'center', gap: isMobile ? 2 : 4}}>
        <IconButton
          onClick={() => onContactClick?.(contact)}
          sx={{
            bgcolor: '#2e7d32', // Dark green
            color: 'white',
            width: isMobile ? 36 : 44,
            height: isMobile ? 36 : 44,
            '&:hover': {bgcolor: '#1b5e20'}
          }}
        >
          <Person fontSize="small"/>
        </IconButton>

        <IconButton
          onClick={handleCall}
          sx={{
            bgcolor: '#2e7d32', // Dark green
            color: 'white',
            width: isMobile ? 36 : 44,
            height: isMobile ? 36 : 44,
            '&:hover': {bgcolor: '#1b5e20'},
            ...((!phoneNumber?.value) && {
              opacity: 0.5,
              cursor: 'not-allowed'
            })
          }}
          disabled={!phoneNumber?.value}
        >
          <Phone fontSize="small"/>
        </IconButton>

        <IconButton
          onClick={handleMessage}
          sx={{
            bgcolor: '#2e7d32', // Dark green
            color: 'white',
            width: isMobile ? 36 : 44,
            height: isMobile ? 36 : 44,
            '&:hover': {bgcolor: '#1b5e20'}
          }}
        >
          <Message fontSize="small"/>
        </IconButton>
      </Box>
    </Box>
  );
};