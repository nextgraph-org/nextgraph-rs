import {forwardRef, useCallback, useState} from 'react';
import {
  Typography,
  Box,
  Chip,
  useTheme,
  alpha,
  Card,
  CardContent,
  Button,
  Collapse, IconButton,
} from '@mui/material';
import {
  UilLinkedin,
} from '@iconscout/react-unicons';
import {
  UilUser,
  UilShieldCheck,
  UilCheckCircle,
  UilUserCircle,
  UilSearchAlt,
  UilMessage,
  UilHeart,
  UilEnvelope,
  UilAngleDown,
  UilAngleUp
} from '@iconscout/react-unicons';
import type {Contact} from '@/types/contact';
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {resolveFrom} from '@/utils/socialContact/contactUtils.ts';
import {PropertyWithSources} from '../PropertyWithSources';
import {ContactTags} from '../ContactTags';
import {defaultTemplates, renderTemplate} from "@/utils/templateRenderer.ts";
import {NextGraphResource} from "@ldo/connected-nextgraph";
import {useNavigate} from "react-router-dom";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {ContactAvatarUpload} from "@/components/contacts/ContactAvatarUpload";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export interface ContactViewHeaderProps {
  contact: Contact | null;
  ormContact: SocialContact | null | undefined;
  isLoading: boolean;
  isEditing?: boolean;
  showStatus?: boolean;
  showTags?: boolean;
  showActions?: boolean;
  validateParent?: (valid: boolean) => void;
  resource?: NextGraphResource
}

export const ContactViewHeader = forwardRef<HTMLDivElement, ContactViewHeaderProps>(
  ({contact, ormContact, isEditing = false, showTags = true, showActions = true, showStatus = true, validateParent, resource}, ref) => {
    const [showNameDetails, setShowNameDetails] = useState(false);
    const navigate = useNavigate();

    const theme = useTheme();
    const {getCategoryIcon, getCategoryById} = useRCardsConfigs();
    const {getRCardById} = useGetRCards();

    const getNaoStatusIndicator = useCallback((contact: Contact) => {
      switch (contact.naoStatus?.value) {
        case 'member':
          return {
            icon: <UilShieldCheck size="20"/>,
            label: 'NAO Member',
            color: theme.palette.success.main,
            bgColor: theme.palette.success.light + '20',
            borderColor: theme.palette.success.main
          };
        case 'invited':
          return {
            icon: <UilCheckCircle size="20"/>,
            label: 'NAO Invited',
            color: theme.palette.warning.main,
            bgColor: theme.palette.warning.light + '20',
            borderColor: theme.palette.warning.main
          };
        default:
          return {
            icon: <UilUserCircle size="20"/>,
            label: 'Not in NAO',
            color: theme.palette.text.secondary,
            bgColor: 'transparent',
            borderColor: theme.palette.divider
          };
      }
    },[theme.palette.divider, theme.palette.success.light, theme.palette.success.main, theme.palette.text.secondary, theme.palette.warning.light, theme.palette.warning.main]);

    const navigateToQR = useCallback(() => {
      const params = new URLSearchParams();
      params.set('contactNuri', resource?.uri ?? "");
      navigate(`/invite?${params.toString()}`);
    }, [resource, navigate]);

    if (!contact) return null;

    const name = resolveFrom(contact, 'name');
    const displayName = name?.value || renderTemplate(defaultTemplates.contactName, name);

    const naoStatus = getNaoStatusIndicator(contact);

    return (
      <Box ref={ref}>
        <Box sx={{
          display: 'flex',
          alignItems: 'flex-start',
          mb: 3,
          flexDirection: 'column',
          textAlign: {xs: 'left', sm: 'left'},
          gap: {xs: 3, sm: '20px'}
        }}>
          <Box sx={{
            display: 'flex',
            gap: 2,
            alignItems: "center"
          }}>
            <ContactAvatarUpload contactNuri={resource?.uri} initial={displayName} useAvatar={false}
                                 isEditing={isEditing}/>
            <Box sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "start",
              alignItems: "start",
              width: {xs: '100%', md: 'auto'},
              cursor: 'pointer',
              '&:hover .name-caret': {
                color: 'primary.main',
              }
            }}
                 onClick={() => setShowNameDetails(!showNameDetails)}
            >
              <PropertyWithSources
                label={"Contact name"}
                contact={ormContact}
                propertyKey="name"
                variant="header"
                textVariant="h6"
                isEditing={isEditing}
                placeholder="Contact Name"
                validateParent={validateParent}
                template={defaultTemplates.contactName}
                resource={resource}
              />
              <IconButton
                className="name-caret"
                sx={{
                  padding: 0,
                  ml: 1,
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'transparent',
                  }
                }}
                disableRipple
              >{showNameDetails ? <UilAngleUp size="24"/> : <UilAngleDown size="24"/>}
              </IconButton>
            </Box>

          </Box>
          <Collapse in={showNameDetails}>
            <Box sx={{mb: 2, ml: 3, mt: 0.2}}>
              <PropertyWithSources
                propertyKey={"name"}
                subKey={"firstName"}
                textVariant={"body1"}
                contact={ormContact}
                isEditing={isEditing}
                label={"First name"}
                hideSources={true}
                resource={resource}
              />
              <PropertyWithSources
                propertyKey={"name"}
                subKey={"middleName"}
                textVariant={"body1"}
                contact={ormContact}
                isEditing={isEditing}
                label={"Middle name"}
                hideSources={true}
                resource={resource}
              />
              <PropertyWithSources
                propertyKey={"name"}
                subKey={"familyName"}
                textVariant={"body1"}
                contact={ormContact}
                isEditing={isEditing}
                label={"Last name"}
                hideSources={true}
                resource={resource}
              />
              <PropertyWithSources
                propertyKey={"name"}
                subKey={"honorificPrefix"}
                textVariant={"body1"}
                contact={ormContact}
                isEditing={isEditing}
                label={"Honorific prefix"}
                hideSources={true}
                resource={resource}
              />
              <PropertyWithSources
                propertyKey={"name"}
                subKey={"honorificSuffix"}
                textVariant={"body1"}
                contact={ormContact}
                isEditing={isEditing}
                label={"Honorific suffix"}
                hideSources={true}
                resource={resource}
              />
            </Box>
          </Collapse>

          <Box sx={{flex: 1, minWidth: 0}}>

            <PropertyWithSources
              contact={ormContact}
              label={"Headline"}
              propertyKey="headline"
              variant="header"
              textVariant="h6"
              isEditing={isEditing}
              placeholder="Job Title / Position"
              template={defaultTemplates.headline}
              templateProperty={"organization"}
              resource={resource}
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
              {contact.rcard && (() => {
                const contactRCardId = contact.rcard ? contact.rcard["@id"] : undefined;
                const rcard = getRCardById(contactRCardId ?? "");

                const categoryInfo = getCategoryById(rcard?.cardId ?? "default");
                return categoryInfo ? (
                  <Chip
                    icon={getCategoryIcon(categoryInfo.id, 16)}
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
                  icon={<UilSearchAlt size="20"/>}
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
                    <UilSearchAlt size="20" color="#4caf50"/>
                    Merged Contact Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                    This contact was created by merging multiple duplicate entries to give you a cleaner contact list.
                  </Typography>
                  <Typography variant="body2" sx={{fontWeight: 500, mb: 1}}>
                    Original sources merged:
                  </Typography>
                  <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                    <Chip size="small" label="LinkedIn Import" icon={<UilLinkedin size="20"/>}/>
                    <Chip size="small" label="Gmail Contacts" icon={<UilEnvelope size="20"/>}/>
                    {contact['@id'] === '3' && <Chip size="small" label="Manual Entry" icon={<UilUser size="20"/>}/>}
                  </Box>
                </CardContent>
              </Card>
            )}

            {showTags && <ContactTags contact={contact} resource={resource}/>}

            {/* Action Buttons */}
            {showActions && <Box sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: {xs: 'center', sm: 'flex-start'},
              mt: 2
            }}>
              {/* Invite to NAO button for non-members */}
              {contact.naoStatus?.value !== 'member' && contact.naoStatus?.value !== 'invited' && (
                <Button
                  variant="contained"
                  startIcon={<UilMessage size="20"/>}
                  size="small"
                  onClick={navigateToQR}
                  color="primary"
                >
                  Invite to NAO
                </Button>
              )}

              {/* Vouch and Praise buttons */}
                <Button
                    variant="contained"
                    startIcon={<UilShieldCheck size="20"/>}
                    size="small"
                    color="primary"
                >
                    Send Vouch
                </Button>
                <Button
                    variant="contained"
                    startIcon={<UilHeart size="20"/>}
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