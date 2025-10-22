import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Link,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Person,
  Badge,
  LinkedIn,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Close,
  Work,
  LocationOn,
  Description,
  Business,
} from '@mui/icons-material';

export const ClaimIdentityPage = () => {
  const navigate = useNavigate();
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
  const [linkedInData, setLinkedInData] = useState({
    email: '',
    password: '',
    useGreencheck: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importError, setImportError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!profileData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!profileData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!profileData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, [field]: event.target.value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Profile data:', profileData);
      navigate('/onboarding/accept-connection');
    } catch (error) {
      console.error('Profile setup failed:', error);
      setFormErrors({ submit: 'Failed to save profile. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkedInImport = () => {
    setShowLinkedInDialog(true);
    setImportError('');
  };

  const handleLinkedInSubmit = async () => {
    if (!linkedInData.email || !linkedInData.password) {
      setImportError('Please enter your LinkedIn credentials');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      // Simulate LinkedIn import
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate populating form with LinkedIn data
      setProfileData({
        firstName: 'John',
        lastName: 'Doe',
        email: linkedInData.email,
        jobTitle: 'Senior Software Engineer',
        company: 'Tech Company',
        location: 'San Francisco, CA',
        bio: 'Experienced software engineer passionate about building great products.',
      });
      setShowLinkedInDialog(false);
    } catch (error) {
      console.error('LinkedIn import failed:', error);
      setImportError('Failed to import from LinkedIn. Please try again or set up manually.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleLinkedInInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setLinkedInData(prev => ({ ...prev, [field]: event.target.value }));
    if (importError) setImportError('');
  };

  const handleGreencheckChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLinkedInData(prev => ({ ...prev, useGreencheck: event.target.checked }));
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
          maxWidth: { xs: 480, md: 640 },
          p: { xs: 3, sm: 4, md: 5 },
          borderRadius: 3,
          backgroundColor: 'background.paper'
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Badge sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
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
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LinkedIn />}
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

        <Divider sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Or enter manually
          </Typography>
        </Divider>

        {/* Profile Form */}
        <Box component="form" onSubmit={handleSubmit}>
          {/* Name Fields */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              label="First Name"
              value={profileData.firstName}
              onChange={handleProfileInputChange('firstName')}
              error={!!formErrors.firstName}
              helperText={formErrors.firstName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
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
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="action" />
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
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Work color="action" />
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
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Business />
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
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOn color="action" />
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
            sx={{ mb: 4 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  <Description color="action" />
                </InputAdornment>
              ),
            }}
            placeholder="Tell us about your professional background and interests..."
          />

          {/* Error Alert */}
          {formErrors.submit && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formErrors.submit}
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => navigate(-1)}
              sx={{
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2
              }}
            >
              Back
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

      {/* LinkedIn Import Dialog */}
      <Dialog
        open={showLinkedInDialog}
        onClose={() => !isImporting && setShowLinkedInDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LinkedIn sx={{ fontSize: 28, color: '#0077B5', mr: 1 }} />
              <Typography variant="h6">Import from LinkedIn</Typography>
            </Box>
            <IconButton
              onClick={() => setShowLinkedInDialog(false)}
              disabled={isImporting}
              size="small"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your LinkedIn credentials to import your professional profile data.
          </Typography>

          {/* Email Field */}
          <TextField
            fullWidth
            label="LinkedIn Email"
            type="email"
            value={linkedInData.email}
            onChange={handleLinkedInInputChange('email')}
            disabled={isImporting}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="action" />
                </InputAdornment>
              ),
            }}
            placeholder="your.email@example.com"
          />

          {/* Password Field */}
          <TextField
            fullWidth
            label="LinkedIn Password"
            type={showPassword ? 'text' : 'password'}
            value={linkedInData.password}
            onChange={handleLinkedInInputChange('password')}
            disabled={isImporting}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                    disabled={isImporting}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Greencheck Option */}
          <Card sx={{ mb: 3, backgroundColor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent sx={{ py: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={linkedInData.useGreencheck}
                    onChange={handleGreencheckChange}
                    color="primary"
                    disabled={isImporting}
                  />
                }
                label={
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Share your LinkedIn data with Greencheck so we can show a view of your LinkedIn social graph
                    </Typography>
                  </Box>
                }
              />
              <Link
                href="https://greencheck.world/about"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600,
                  ml: 4,
                  display: 'inline-block',
                  mt: 1
                }}
              >
                Learn more about Greencheck →
              </Link>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {importError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {importError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setShowLinkedInDialog(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleLinkedInSubmit}
            disabled={isImporting}
            sx={{
              backgroundColor: '#0077B5',
              '&:hover': {
                backgroundColor: '#005885',
              }
            }}
          >
            {isImporting ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Importing...
              </>
            ) : (
              'Import Profile'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};