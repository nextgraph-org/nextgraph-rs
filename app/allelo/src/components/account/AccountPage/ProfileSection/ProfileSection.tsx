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
} from '@mui/material';
import {
  Edit,
  CheckCircle,
} from '@mui/icons-material';
import PersonhoodCredentialsComponent from '@/components/account/PersonhoodCredentials';
import type {ProfileSectionProps} from '../types';
import {useNavigate} from "react-router";
import {FormPhoneField} from "@/components/ui/FormPhoneField/FormPhoneField";
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";
import {PropertyWithSources} from "@/components/contacts/PropertyWithSources";
import {MultiPropertyWithVisibility} from "@/components/contacts/MultiPropertyWithVisibility";

export const ProfileSection = forwardRef<HTMLDivElement, ProfileSectionProps>(
  ({personhoodCredentials, initialProfileData}, ref) => {
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [showGreencheckDialog, setShowGreencheckDialog] = useState(false);
    const [greencheckData, setGreencheckData] = useState({
      phone: '',
    });
    const [valid, setValid] = useState<boolean>(false);

    const name = resolveFrom(initialProfileData, 'name');
    const avatar = resolveFrom(initialProfileData, 'photo');

    const handleEdit = () => {
      setIsEditing(true);
    };

    const handleSave = () => {
      setIsEditing(false);
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
      <Box ref={ref}>
        <Card>
          <CardContent>
            {/* Header with Edit/Save/Cancel buttons */}
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
              <Typography variant="h6" sx={{fontWeight: 600}}>
                Profile Information
              </Typography>
              <Box>
                {!isEditing ? (
                  <Button
                    variant="outlined"
                    startIcon={<Edit/>}
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Edit/>}
                    onClick={handleSave}
                  >
                    Exit
                  </Button>
                )}
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Left side - Avatar and basic info */}
              <Grid size={{xs: 12, md: 4}}>
                <Box sx={{textAlign: 'center'}}>
                  <Box sx={{position: 'relative', display: 'inline-block'}}>
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
                      {name?.value?.charAt(0)}
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
                  <PropertyWithSources
                    propertyKey={"name"}
                    textVariant={"h5"}
                    contact={initialProfileData}
                    isEditing={isEditing}
                    required={true}
                  />
                  <PropertyWithSources
                    propertyKey={"headline"}
                    textVariant={"body2"}
                    contact={initialProfileData}
                    isEditing={isEditing}
                  />
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

                  {/* Greencheck Section - only show in edit mode */}
                  {isEditing && (
                    <Box sx={{mt: 2}}>
                      <Card sx={{backgroundColor: 'grey.50', border: '1px solid', borderColor: 'grey.200'}}>
                        <CardContent sx={{py: 2}}>
                          <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                            <Box>
                              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
                                <CheckCircle sx={{fontSize: 20, color: 'success.main'}}/>
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
          </CardContent>
        </Card>

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

        {/* Personhood Credentials Section */}
        <Box sx={{mt: 4}}>
          <PersonhoodCredentialsComponent
            credentials={personhoodCredentials}
          />
        </Box>
      </Box>
    );
  }
);

ProfileSection.displayName = 'ProfileSection';