import {forwardRef} from 'react';
import {
  Typography,
  Box,
  Chip,
  useTheme,
  alpha,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  LinkedIn,
  Person,
  VerifiedUser,
  CheckCircle,
  PersonOutline, PersonSearch, Send, Favorite, Email
} from '@mui/icons-material';
import type {Contact} from '@/types/contact';
import {useRelationshipCategories} from "@/hooks/useRelationshipCategories";
import {resolveFrom} from '@/utils/socialContact/contactUtils.ts';
import {getContactPhotoStyles} from "@/utils/photoStyles";
import {PropertyWithSources} from '../PropertyWithSources';
import { ContactTags } from '../ContactTags';

export interface ContactViewHeaderProps {
  contact: Contact | null;
  isLoading: boolean;
  isEditing?: boolean;
  showStatus?: boolean;
  showTags?: boolean;
  showActions?: boolean;
  validateParent?: (valid: boolean) => void;
}

export const ContactViewHeader = forwardRef<HTMLDivElement, ContactViewHeaderProps>(
  ({contact, isEditing = false, showTags = true, showActions = true, showStatus = true, validateParent}, ref) => {
    const theme = useTheme();
    const {getCategoryIcon, getCategoryById} = useRelationshipCategories();

    if (!contact) return null;

    const name = resolveFrom(contact, 'name');
    const photo = resolveFrom(contact, 'photo');

    const getNaoStatusIndicator = (contact: Contact) => {
      switch (contact.naoStatus?.value) {
        case 'member':
          return {
            icon: <VerifiedUser/>,
            label: 'NAO Member',
            color: theme.palette.success.main,
            bgColor: theme.palette.success.light + '20',
            borderColor: theme.palette.success.main
          };
        case 'invited':
          return {
            icon: <CheckCircle/>,
            label: 'NAO Invited',
            color: theme.palette.warning.main,
            bgColor: theme.palette.warning.light + '20',
            borderColor: theme.palette.warning.main
          };
        default:
          return {
            icon: <PersonOutline/>,
            label: 'Not in NAO',
            color: theme.palette.text.secondary,
            bgColor: 'transparent',
            borderColor: theme.palette.divider
          };
      }
    };
    const naoStatus = getNaoStatusIndicator(contact);

    return (
      <Box ref={ref}>
        <Box sx={{
          display: 'flex',
          alignItems: 'flex-start',
          mb: 3,
          flexDirection: {xs: 'column', sm: 'row'},
          textAlign: {xs: 'center', sm: 'left'},
          gap: {xs: 3, sm: '20px'}
        }}>
          <Box
            sx={{
              width: {xs: 100, sm: 120},
              height: {xs: 100, sm: 120},
              borderRadius: '50%',
              backgroundImage: photo?.value ? `url(${photo.value})` : 'none',
              backgroundSize: photo?.value ? getContactPhotoStyles(name?.value || '').backgroundSize : 'cover',
              backgroundPosition: photo?.value ? getContactPhotoStyles(name?.value || '').backgroundPosition : 'center center',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: photo?.value ? 'transparent' : 'primary.main',
              color: 'white',
              fontSize: {xs: '2rem', sm: '3rem'},
              fontWeight: 'bold',
              flexShrink: 0
            }}
          >
            {!photo?.value && (name?.value?.charAt(0) || '')}
          </Box>

          <Box sx={{flex: 1, minWidth: 0}}>
            <PropertyWithSources
              label={"Contact name"}
              contact={contact}
              propertyKey="name"
              variant="header"
              textVariant="h4"
              isEditing={isEditing}
              placeholder="Contact Name"
              required={true}
              validateParent={validateParent}
            />

            <PropertyWithSources
              contact={contact}
              label={"Headline"}
              propertyKey="headline"
              variant="header"
              textVariant="h6"
              isEditing={isEditing}
              placeholder="Job Title / Position"
            />

            {showStatus && <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap'}}>
              <Chip
                icon={naoStatus.icon}
                label={naoStatus.label}
                variant="outlined"
                sx={{
                  backgroundColor: naoStatus.bgColor,
                  borderColor: naoStatus.borderColor,
                  color: naoStatus.color,
                  fontWeight: 500
                }}
              />

              {/* Relationship Category Indicator */}
              {contact.relationshipCategory && (() => {
                const categoryInfo = getCategoryById(contact.relationshipCategory);
                return categoryInfo ? (
                  <Chip
                    icon={getCategoryIcon(contact.relationshipCategory, 16)}
                    label={categoryInfo.name}
                    variant="outlined"
                    sx={{
                      backgroundColor: alpha(categoryInfo.color, 0.08),
                      borderColor: alpha(categoryInfo.color, 0.2),
                      color: categoryInfo.color,
                      fontWeight: 500
                    }}
                  />
                ) : null;
              })()}

              {/* Merged Contact Indicator */}
              {(contact.mergedFrom?.size ?? 0) > 0 && (
                <Chip
                  icon={<PersonSearch/>}
                  label="Merged Contact"
                  variant="outlined"
                  sx={{
                    backgroundColor: alpha('#4caf50', 0.08),
                    borderColor: alpha('#4caf50', 0.2),
                    color: '#4caf50',
                    fontWeight: 500
                  }}
                />
              )}
            </Box>}

            {/* Merged Contact Details */}
            {(contact['@id'] === '1' || contact['@id'] === '3' || contact['@id'] === '5') && (
              <Card variant="outlined" sx={{mb: 2, backgroundColor: alpha('#4caf50', 0.04)}}>
                <CardContent sx={{p: 2}}>
                  <Typography variant="h6" sx={{mb: 1, display: 'flex', alignItems: 'center', gap: 1}}>
                    <PersonSearch color="success"/>
                    Merged Contact Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                    This contact was created by merging multiple duplicate entries to give you a cleaner contact list.
                  </Typography>
                  <Typography variant="body2" sx={{fontWeight: 500, mb: 1}}>
                    Original sources merged:
                  </Typography>
                  <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                    <Chip size="small" label="LinkedIn Import" icon={<LinkedIn/>}/>
                    <Chip size="small" label="Gmail Contacts" icon={<Email/>}/>
                    {contact['@id'] === '3' && <Chip size="small" label="Manual Entry" icon={<Person/>}/>}
                  </Box>
                </CardContent>
              </Card>
            )}

            {showTags && <ContactTags contact={contact}/>}

            {/* Action Buttons */}
            {showActions && <Box sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: {xs: 'center', sm: 'flex-start'},
              mt: 2
            }}>
              {/* Invite to NAO button for non-members */}
              {contact.naoStatus?.value === 'not_invited' && (
                <Button
                  variant="contained"
                  startIcon={<Send/>}
                  size="small"
                  onClick={/*handleInviteToNao*/() => {
                  }}
                  color="primary"
                >
                  Invite to NAO
                </Button>
              )}

              {/* Vouch and Praise buttons */}
                <Button
                    variant="contained"
                    startIcon={<VerifiedUser/>}
                    size="small"
                    color="primary"
                >
                    Send Vouch
                </Button>
                <Button
                    variant="contained"
                    startIcon={<Favorite/>}
                    size="small"
                    sx={{
                      backgroundColor: '#f8bbd9',
                      color: '#d81b60',
                      '&:hover': {
                        backgroundColor: '#f48fb1'
                      }
                    }}
                >
                    Send Praise
                </Button>
            </Box>}

          </Box>
        </Box>
      </Box>
    );
  }
);

ContactViewHeader.displayName = 'ContactViewHeader';