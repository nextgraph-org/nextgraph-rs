import {forwardRef, useCallback, useState} from 'react';
import {
  Box,
  Grid,
  Button,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  UilEdit,
  UilAngleUp, UilAngleDown,
} from '@iconscout/react-unicons';
import {PropertyWithSources} from "@/components/contacts/PropertyWithSources";
import {MultiPropertyWithVisibility} from "@/components/contacts/MultiPropertyWithVisibility";
import {defaultTemplates} from "@/utils/templateRenderer.ts";
import {ContactTags} from "@/components/contacts";
import {ContactAvatarUpload} from "@/components/contacts/ContactAvatarUpload";
import {PersonhoodCredentials} from "@/types/personhood.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {resolveContactName} from "@/utils/socialContact/contactUtilsOrm.ts";

export interface ProfileSectionProps {
  personhoodCredentials?: PersonhoodCredentials;
  onGenerateQR?: () => void;
  onRefreshCredentials?: () => void;
  initialProfileData: SocialContact | undefined;
  isAddProfile?: boolean;
}

export const ProfileSection = forwardRef<HTMLDivElement, ProfileSectionProps>(
  ({initialProfileData, isAddProfile}, ref) => {
    const [isEditing, setIsEditing] = useState(isAddProfile ?? false);
    const [showNameDetails, setShowNameDetails] = useState(false);

    const displayName = resolveContactName(initialProfileData);

    const handleEdit = useCallback(() => {
      setIsEditing(true);
      setShowNameDetails(true);
    }, []);

    const handleSave = useCallback(() => {
      setIsEditing(false);
      setShowNameDetails(false);
    }, []);

    return (
      <Box ref={ref} sx={{position: 'relative'}}>
        <Grid container spacing={3}>
          {/* Left side - Avatar and basic info */}
          <Grid size={{xs: 12, md: 4}}>
            <Box sx={{
              display: 'flex',
              alignItems: "center"
            }}>
              <ContactAvatarUpload contactNuri={initialProfileData ? initialProfileData["@graph"] : ""}
                                   initial={displayName}
                                   isEditing={isEditing} forProfile={true}/>
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
                  propertyKey={"name"}
                  textVariant={"h6"}
                  contact={initialProfileData}
                  isEditing={isEditing}
                  label={"Full name"}
                  hideLabel={true}
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
                  contact={initialProfileData}
                  isEditing={isEditing}
                  label={"First name"}
                  hideSources={true}
                />
                <PropertyWithSources
                  propertyKey={"name"}
                  subKey={"middleName"}
                  textVariant={"body1"}
                  contact={initialProfileData}
                  isEditing={isEditing}
                  label={"Middle name"}
                  hideSources={true}
                />
                <PropertyWithSources
                  propertyKey={"name"}
                  subKey={"familyName"}
                  textVariant={"body1"}
                  contact={initialProfileData}
                  isEditing={isEditing}
                  label={"Last name"}
                  hideSources={true}
                />
                <PropertyWithSources
                  propertyKey={"name"}
                  subKey={"honorificPrefix"}
                  textVariant={"body1"}
                  contact={initialProfileData}
                  isEditing={isEditing}
                  label={"Honorific prefix"}
                  hideSources={true}
                />
                <PropertyWithSources
                  propertyKey={"name"}
                  subKey={"honorificSuffix"}
                  textVariant={"body1"}
                  contact={initialProfileData}
                  isEditing={isEditing}
                  label={"Honorific suffix"}
                  hideSources={true}
                />
              </Box>
            </Collapse>
            <Box sx={{
              width: {xs: '100%', md: 'auto'},
              mt: {xs: 1, md: 0}
            }}>
              <PropertyWithSources
                propertyKey={"headline"}
                label={"Headline"}
                hideLabel={true}
                textVariant={"body2"}
                contact={initialProfileData}
                isEditing={isEditing}
                template={defaultTemplates.headline}
                templateProperty={"organization"}
              />
            </Box>
            <Box sx={{pt: 1}}>
              <ContactTags contact={initialProfileData}/>
            </Box>
          </Grid>

          {/* Right side - Contact and social info */}
          <Grid size={{xs: 12, md: 8}}>
            <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
              {/* Basic contact info */}
              <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 6}}>
                  <MultiPropertyWithVisibility
                    label={"Email"}
                    hideIcon={true}
                    propertyKey={"email"}
                    contact={initialProfileData}
                    isEditing={isEditing}
                    validateType={"email"}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <MultiPropertyWithVisibility
                    label={"Phone"}
                    hideIcon={true}
                    propertyKey={"phoneNumber"}
                    contact={initialProfileData}
                    isEditing={isEditing}
                    validateType={"phone"}
                    required={false}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <MultiPropertyWithVisibility
                    label={"Location"}
                    hideIcon={true}
                    propertyKey={"address"}
                    contact={initialProfileData}
                    isEditing={isEditing}
                    validateType={"text"}
                    variant={"addresses"}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <MultiPropertyWithVisibility
                    label={"Website"}
                    hideIcon={true}
                    propertyKey={"url"}
                    contact={initialProfileData}
                    isEditing={isEditing}
                    validateType={"url"}
                    variant={"url"}
                  />
                </Grid>
              </Grid>

              {/* Bio */}
              <Box>
                <PropertyWithSources
                  label={"Bio"}
                  hideIcon={true}
                  propertyKey={"biography"}
                  contact={initialProfileData}
                  isEditing={isEditing}
                  isMultiline={true}
                />
              </Box>

              <Box>
                <MultiPropertyWithVisibility
                  label={"Social Networks"}
                  hideIcon={true}
                  propertyKey={"account"}
                  variant={"accounts"}
                  contact={initialProfileData}
                  isEditing={isEditing}
                  validateType={"text"}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{
          display: {xs: 'block', md: 'block'},
          position: 'fixed',
          top: 10,
          right: 16,
          zIndex: 1000,
        }}>{isAddProfile ? <></> : !isEditing ? (
          <Button
            variant="contained"
            startIcon={<UilEdit size="20"/>}
            onClick={handleEdit}
          >
            Edit
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<UilEdit size="20"/>}
            onClick={handleSave}
          >
            Done editing
          </Button>
        )}
        </Box>


      </Box>
    );
  }
);

ProfileSection.displayName = 'ProfileSection';