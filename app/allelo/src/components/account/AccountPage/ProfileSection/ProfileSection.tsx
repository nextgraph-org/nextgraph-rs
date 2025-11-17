import {forwardRef, useState} from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  UilEdit,
  UilCheckCircle,
  UilAngleUp, UilAngleDown,
} from '@iconscout/react-unicons';
import type {ProfileSectionProps} from '../types';
import {useNavigate} from "react-router-dom";
import {FormPhoneField} from "@/components/ui/FormPhoneField/FormPhoneField";
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";
import {PropertyWithSources} from "@/components/contacts/PropertyWithSources";
import {MultiPropertyWithVisibility} from "@/components/contacts/MultiPropertyWithVisibility";
import {defaultTemplates, renderTemplate} from "@/utils/templateRenderer.ts";
import {ContactTags} from "@/components/contacts";

export const ProfileSection = forwardRef<HTMLDivElement, ProfileSectionProps>(
  ({initialProfileData, resource}, ref) => {
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [showGreencheckDialog, setShowGreencheckDialog] = useState(false);
    const [showNameDetails, setShowNameDetails] = useState(false);
    const [greencheckData, setGreencheckData] = useState({
      phone: '',
    });
    const [valid, setValid] = useState<boolean>(false);

    const name = resolveFrom(initialProfileData, 'name');
    const displayName = name?.value || renderTemplate(defaultTemplates.contactName, name);

    const avatar = resolveFrom(initialProfileData, 'photo');

    const handleEdit = () => {
      setIsEditing(true);
      setShowNameDetails(true);
    };

    const handleSave = () => {
      setIsEditing(false);
      setShowNameDetails(false);
    };

    const handleGreencheckConnect = () => {
      setShowGreencheckDialog(true);
    };

    const handleGreencheckSubmit = () => {
      navigate('/verify-phone/' + greencheckData.phone)
    };

    /*    const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              handleFieldChange('avatar', reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        };*/

    return (
      <Box ref={ref} sx={{position: 'relative'}}>
        <Card>
          <CardContent>
            {/* Header with Avatar on mobile, title on desktop */}
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
              <Typography variant="h6" sx={{fontWeight: 600}}>
                Profile Information
              </Typography>
              <Box sx={{display: {xs: 'block', md: 'none'}}}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: 'primary.main',
                    fontSize: '3rem'
                  }}
                  alt="Profile"
                  src={avatar?.value}
                >
                  {displayName?.charAt(0)}
                </Avatar>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Left side - Avatar and basic info */}
              <Grid size={{xs: 12, md: 4}}>
                <Box>
                  <Box sx={{
                    display: {xs: 'none', md: 'inline-block'},
                  }}>
                    <Avatar
                      sx={{
                        width: 120,
                        height: 120,
                        mb: 2,
                        bgcolor: 'primary.main',
                        fontSize: '3rem'
                      }}
                      alt="Profile"
                      src={avatar?.value}
                    >
                      {displayName?.charAt(0)}
                    </Avatar>
                    {/* {isEditing && (
                      <>
                        <input
                          accept="image/*"
                          id="avatar-upload"
                          type="file"
                          hidden
                          onChange={handleAvatarUpload}
                        />
                        <label htmlFor="avatar-upload">
                          <IconButton
                            component="span"
                            sx={{
                              position: 'absolute',
                              bottom: 16,
                              right: -8,
                              bgcolor: 'background.paper',
                              boxShadow: 2,
                              '&:hover': { bgcolor: 'background.paper' }
                            }}
                          >
                            <PhotoCamera />
                          </IconButton>
                        </label>
                      </>
                    )}*/}
                  </Box>
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
                      textVariant={"h5"}
                      contact={initialProfileData}
                      isEditing={isEditing}
                      label={"Full name"}
                      hideLabel={true}
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
                  <Collapse in={showNameDetails}>
                    <Box sx={{
                      mt: 1,
                      ml: {xs: 2, md: 3},
                      width: {xs: '100%', md: 'auto'},
                    }}>
                      <PropertyWithSources
                        propertyKey={"name"}
                        subKey={"firstName"}
                        textVariant={"body1"}
                        contact={initialProfileData}
                        isEditing={isEditing}
                        label={"First name"}
                        hideSources={true}
                        resource={resource}
                      />
                      <PropertyWithSources
                        propertyKey={"name"}
                        subKey={"middleName"}
                        textVariant={"body1"}
                        contact={initialProfileData}
                        isEditing={isEditing}
                        label={"Middle name"}
                        hideSources={true}
                        resource={resource}
                      />
                      <PropertyWithSources
                        propertyKey={"name"}
                        subKey={"familyName"}
                        textVariant={"body1"}
                        contact={initialProfileData}
                        isEditing={isEditing}
                        label={"Last name"}
                        hideSources={true}
                        resource={resource}
                      />
                      <PropertyWithSources
                        propertyKey={"name"}
                        subKey={"honorificPrefix"}
                        textVariant={"body1"}
                        contact={initialProfileData}
                        isEditing={isEditing}
                        label={"Honorific prefix"}
                        hideSources={true}
                        resource={resource}
                      />
                      <PropertyWithSources
                        propertyKey={"name"}
                        subKey={"honorificSuffix"}
                        textVariant={"body1"}
                        contact={initialProfileData}
                        isEditing={isEditing}
                        label={"Honorific suffix"}
                        hideSources={true}
                        resource={resource}
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
                      resource={resource}
                    />
                  </Box>
                </Box>
                <Box>
                  <ContactTags contact={initialProfileData} resource={resource}/>
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
                        resource={resource}
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
                        resource={resource}
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
                        resource={resource}
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
                        resource={resource}
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
                      resource={resource}
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
                      resource={resource}
                    />
                  </Box>

                  {/* Greencheck Section - only show in edit mode */}
                  {isEditing && (
                    <Box sx={{mt: 2}}>
                      <Card sx={{backgroundColor: 'grey.50', border: '1px solid', borderColor: 'grey.200'}}>
                        <CardContent sx={{py: 2}}>
                          <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                            <Box>
                              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
                                <UilCheckCircle size="20" style={{color: 'inherit'}}/>
                                <Typography variant="body2" sx={{fontWeight: 600}}>
                                  Claim other accounts via Greencheck
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>
                                Verify and import your profiles from other platforms
                              </Typography>
                            </Box>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={handleGreencheckConnect}
                              sx={{ml: 2}}
                            >
                              Connect
                            </Button>
                          </Box>
                          <Link
                            href="https://greencheck.world/about"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              display: 'inline-block',
                              mt: 2
                            }}
                          >
                            Learn more about Greencheck →
                          </Link>
                        </CardContent>
                      </Card>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>

            {/* Edit/Exit button - FAB position on mobile, inline on desktop */}
            <Box sx={{
              display: {xs: 'none', md: 'flex'},
              justifyContent: 'flex-end',
              mt: 3
            }}>
              {!isEditing ? (
                <Button
                  variant="outlined"
                  startIcon={<UilEdit size="20"/>}
                  onClick={handleEdit}
                >
                  Edit
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<UilEdit size="20"/>}
                  onClick={handleSave}
                >
                  Exit
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Edit/Exit button - Fixed position bottom right on mobile, above tabs */}
        <Box sx={{
          display: {xs: 'block', md: 'none'},
          position: 'fixed',
          bottom: 72,
          right: 16,
          zIndex: 1000,
        }}>
          {!isEditing ? (
            <Button
              variant="outlined"
              startIcon={<UilEdit size="20"/>}
              onClick={handleEdit}
            >
              Edit
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<UilEdit size="20"/>}
              onClick={handleSave}
            >
              Exit
            </Button>
          )}
        </Box>

        {/* Greencheck Connection Dialog */}
        <Dialog open={showGreencheckDialog} onClose={() => setShowGreencheckDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Connect to Greencheck</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{mb: 3}}>
              Enter your details to verify and claim your accounts from other platforms via Greencheck.
            </Typography>

            <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, pt: 1}}>
              <FormPhoneField
                fullWidth
                label="Phone number"
                value={greencheckData.phone}
                onChange={(e) => {
                  setValid(e.isValid);
                  setGreencheckData(prev => ({...prev, phone: e.target.value}))
                }}
                required
              />
            </Box>

            <Box sx={{
              mt: 3,
              p: 2,
              backgroundColor: 'info.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'info.200'
            }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Note:</strong> Greencheck will verify your identity and help you claim profiles from LinkedIn,
                Twitter, Facebook, and other platforms.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowGreencheckDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleGreencheckSubmit}
              disabled={!valid || greencheckData.phone.trim() === ""}
            >
              Connect to Greencheck
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
);

ProfileSection.displayName = 'ProfileSection';