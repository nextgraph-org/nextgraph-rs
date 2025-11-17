import React, {useCallback, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useOnboarding} from '@/hooks/useOnboarding';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Alert,
  Divider,
} from '@mui/material';
import {
  LinkedIn,
} from '@mui/icons-material';
import {
  UilUser,
  UilAward,
  UilEnvelope,
  UilBriefcase,
  UilLocationPoint,
  UilFileAlt,
  UilBuilding,
} from '@iconscout/react-unicons';
import {ImportSourceRegistry} from "@/importers/importSourceRegistry.tsx";
import {ImportingOverlay} from "@/components/contacts/ImportContacts/ImportingOverlay.tsx";
import {useImportContacts} from "@/hooks/contacts/useImportContacts.ts";
import {Contact} from "@/types/contact.ts";
import {useSettings} from "@/hooks/useSettings.ts";
import {useUpdateProfile} from "@/hooks/useUpdateProfile.ts";
import {processContactFromJSON} from "@/utils/socialContact/contactUtils.ts";

export const ClaimIdentityPage = () => {
  const {saveToStorage} = useSettings();
  const {updateProfile} = useUpdateProfile();

  const linkedIn = ImportSourceRegistry.getConfig('linkedin');

  const navigate = useNavigate();
  const {completeOnboarding} = useOnboarding();
  const [showLinkedInDialog, setShowLinkedInDialog] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    company: '',
    location: '',
    bio: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const onComplete = useCallback(() => {
    completeOnboarding();
    navigate('/onboarding/welcome');
  }, [completeOnboarding, navigate]);

  const {importProgress, isImporting, importContacts} = useImportContacts(onComplete);

  const handleRunnerComplete = useCallback(async (contacts?: Contact[], callback?: () => void) => {
    if (contacts)
      await importContacts(contacts);
    await saveToStorage({lnImportRequested: true});
    if (callback)
      callback();
    console.log('Import completed:', contacts);
  }, [importContacts, saveToStorage]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!profileData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRunnerClose = useCallback(() => {
    setShowLinkedInDialog(false);
  }, []);

  const handleProfileInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({...prev, [field]: event.target.value}));
    if (formErrors[field]) {
      setFormErrors(prev => ({...prev, [field]: ''}));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);

    try {
      // Transform form data to SocialContact JSON schema
      const profileJson: any = {};

      // Add name if provided
      if (profileData.firstName || profileData.lastName) {
        profileJson.name = [{
          firstName: profileData.firstName,
          familyName: profileData.lastName,
          source: 'user',
        }];
      }

      // Add email if provided
      if (profileData.email) {
        profileJson.email = [{
          value: profileData.email,
          source: 'user',
          preferred: true,
        }];
      }

      // Add organization if company or jobTitle provided
      if (profileData.company || profileData.jobTitle || profileData.location) {
        profileJson.organization = [{
          value: profileData.company,
          position: profileData.jobTitle,
          source: 'user',
          current: true,
        }];
      }

      if (profileData.location) {
        profileJson.address = [{
          value: profileData.location,
          source: 'user',
          preferred: true,
        }];
      }

      // Add biography if provided
      if (profileData.bio) {
        profileJson.biography = [{
          value: profileData.bio,
          source: 'user',
        }];
      }

      // Convert JSON to Contact object with proper LdSets
      const contact = await processContactFromJSON(profileJson, false);

      // Save to NextGraph
      await updateProfile(contact);

      onComplete();
    } catch (error) {
      console.error('Profile setup failed:', error);
      setFormErrors({submit: 'Failed to save profile. Please try again.'});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkedInImport = () => {
    setShowLinkedInDialog(true);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: {xs: 480, md: 640},
          p: {xs: 3, sm: 4, md: 5},
          borderRadius: 3,
          backgroundColor: 'background.paper'
        }}
      >
        {/* Header */}
        <Box sx={{textAlign: 'center', mb: 4}}>
          <UilAward size="48" color="currentColor" style={{color: 'var(--mui-palette-primary-main)'}}/>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              mt: 2,
              color: 'text.primary'
            }}
          >
            Claim Your Identity
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Set up your professional profile to join the NAO network
          </Typography>
        </Box>

        {/* LinkedIn Import Button */}
        <Box sx={{mb: 3}}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LinkedIn/>}
            onClick={handleLinkedInImport}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#0077B5',
              color: '#0077B5',
              '&:hover': {
                backgroundColor: '#0077B510',
                borderColor: '#0077B5',
              }
            }}
          >
            Import from LinkedIn
          </Button>
        </Box>

        <Divider sx={{mb: 3}}>
          <Typography variant="body2" color="text.secondary">
            Or enter manually
          </Typography>
        </Divider>

        {/* Profile Form */}
        <Box component="form" onSubmit={handleSubmit}>
          {/* Name Fields */}
          <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm: 'row'}, gap: 2, mb: 3}}>
            <TextField
              fullWidth
              label="First Name"
              value={profileData.firstName}
              required={true}
              onChange={handleProfileInputChange('firstName')}
              error={!!formErrors.firstName}
              helperText={formErrors.firstName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <UilUser size="20"/>
                  </InputAdornment>
                ),
              }}
              placeholder="John"
            />
            <TextField
              fullWidth
              label="Last Name"
              value={profileData.lastName}
              onChange={handleProfileInputChange('lastName')}
              error={!!formErrors.lastName}
              helperText={formErrors.lastName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <UilUser size="20"/>
                  </InputAdornment>
                ),
              }}
              placeholder="Doe"
            />
          </Box>

          {/* Email Field */}
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={profileData.email}
            onChange={handleProfileInputChange('email')}
            error={!!formErrors.email}
            helperText={formErrors.email}
            sx={{mb: 3}}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <UilEnvelope size="20"/>
                </InputAdornment>
              ),
            }}
            placeholder="john.doe@example.com"
          />

          {/* Job Title Field */}
          <TextField
            fullWidth
            label="Job Title"
            value={profileData.jobTitle}
            onChange={handleProfileInputChange('jobTitle')}
            sx={{mb: 3}}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <UilBriefcase size="20"/>
                </InputAdornment>
              ),
            }}
            placeholder="Senior Software Engineer"
          />

          {/* Company Field */}
          <TextField
            fullWidth
            label="Company"
            value={profileData.company}
            onChange={handleProfileInputChange('company')}
            sx={{mb: 3}}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <UilBuilding size="20"/>
                </InputAdornment>
              ),
            }}
            placeholder="Tech Company Inc."
          />

          {/* Location Field */}
          <TextField
            fullWidth
            label="Location"
            value={profileData.location}
            onChange={handleProfileInputChange('location')}
            sx={{mb: 3}}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <UilLocationPoint size="20"/>
                </InputAdornment>
              ),
            }}
            placeholder="San Francisco, CA"
          />

          {/* Bio Field */}
          <TextField
            fullWidth
            label="Bio"
            value={profileData.bio}
            onChange={handleProfileInputChange('bio')}
            multiline
            rows={3}
            sx={{mb: 4}}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{alignSelf: 'flex-start', mt: 1}}>
                  <UilFileAlt size="20"/>
                </InputAdornment>
              ),
            }}
            placeholder="Tell us about your professional background and interests..."
          />

          {/* Error Alert */}
          {formErrors.submit && (
            <Alert severity="error" sx={{mb: 3}}>
              {formErrors.submit}
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{display: 'flex', gap: 2}}>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => {
                onComplete();
              }}
              sx={{
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2
              }}
            >
              Skip
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              sx={{
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2
              }}
            >
              {isSubmitting ? 'Creating Profile...' : 'Continue'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {linkedIn?.Runner && (
        <linkedIn.Runner
          open={showLinkedInDialog}
          onGetResult={handleRunnerComplete}
          onClose={handleRunnerClose}
          onError={() => {
          }}
        />
      )}

      <ImportingOverlay isImporting={isImporting} importProgress={importProgress}/>

    </Box>
  );
};