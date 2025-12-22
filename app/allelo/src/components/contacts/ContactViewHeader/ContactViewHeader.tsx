import {forwardRef, useCallback, useState} from 'react';
import {
  Box,
  Chip,
  useTheme,
  alpha,
  Button,
  Collapse, IconButton,
} from '@mui/material';
import {
  UilShieldCheck,
  UilCheckCircle,
  UilUserCircle,
  UilSearchAlt,
  UilMessage,
  UilHeart,
  UilAngleDown,
  UilAngleUp
} from '@iconscout/react-unicons';
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {PropertyWithSources} from '../PropertyWithSources';
import {ContactTags} from '../ContactTags';
import {defaultTemplates} from "@/utils/templateRenderer.ts";
import {NextGraphResource} from "@ldo/connected-nextgraph";
import {useNavigate} from "react-router-dom";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {ContactAvatarUpload} from "@/components/contacts/ContactAvatarUpload";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useContactOrmStore} from "@/stores/contactOrmStore.ts";

export interface ContactViewHeaderProps {
  contact: SocialContact | null;
  isEditing?: boolean;
  showStatus?: boolean;
  showTags?: boolean;
  showActions?: boolean;
  validateParent?: (valid: boolean) => void;
  resource?: NextGraphResource
}

export const ContactViewHeader = forwardRef<HTMLDivElement, ContactViewHeaderProps>(
  ({contact, isEditing = false, showTags = true, showActions = true, showStatus = true, validateParent}, ref) => {
    const [showNameDetails, setShowNameDetails] = useState(false);
    const navigate = useNavigate();

    const theme = useTheme();
    const {getCategoryIcon, getCategoryById} = useRCardsConfigs();
    const {getRCardById} = useGetRCards();

    const {
      resolveName,
    } = useContactOrmStore();

    const getNaoStatusIndicator = useCallback((contact: SocialContact) => {
      switch (contact.naoStatus) {
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
      if (contact) {
        const params = new URLSearchParams();
        params.set('contactNuri', contact["@graph"] ?? "");
        navigate(`/invite?${params.toString()}`);
      }
    }, [contact, navigate]);

    if (!contact) return null;

    const displayName = resolveName(contact);
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
            <ContactAvatarUpload contactNuri={contact["@graph"]} initial={displayName} useAvatar={false}
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
                contact={contact}
                propertyKey="name"
                variant="header"
                textVariant="h6"
                isEditing={isEditing}
                placeholder="Contact Name"
                validateParent={validateParent}
                template={defaultTemplates.contactName}
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
                contact={contact}
                isEditing={isEditing}
                label={"First name"}
                hideSources={true}
              />
              <PropertyWithSources
                propertyKey={"name"}
                subKey={"middleName"}
                textVariant={"body1"}
                contact={contact}
                isEditing={isEditing}
                label={"Middle name"}
                hideSources={true}
              />
              <PropertyWithSources
                propertyKey={"name"}
                subKey={"familyName"}
                textVariant={"body1"}
                contact={contact}
                isEditing={isEditing}
                label={"Last name"}
                hideSources={true}
              />
              <PropertyWithSources
                propertyKey={"name"}
                subKey={"honorificPrefix"}
                textVariant={"body1"}
                contact={contact}
                isEditing={isEditing}
                label={"Honorific prefix"}
                hideSources={true}
              />
              <PropertyWithSources
                propertyKey={"name"}
                subKey={"honorificSuffix"}
                textVariant={"body1"}
                contact={contact}
                isEditing={isEditing}
                label={"Honorific suffix"}
                hideSources={true}
              />
            </Box>
          </Collapse>

          <Box sx={{flex: 1, minWidth: 0}}>

            <PropertyWithSources
              contact={contact}
              label={"Headline"}
              propertyKey="headline"
              variant="header"
              textVariant="h6"
              isEditing={isEditing}
              placeholder="Job Title / Position"
              template={defaultTemplates.headline}
              templateProperty={"organization"}
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
                const contactRCardId = contact.rcard;
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

            {/*TODO: {showTags && <ContactTags contact={contact} resource={resource}/>}*/}

            {/* Action Buttons */}
            {showActions && <Box sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: {xs: 'center', sm: 'flex-start'},
              mt: 2
            }}>
              {/* Invite to NAO button for non-members */}
              {contact.naoStatus !== 'member' && contact.naoStatus !== 'invited' && (
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