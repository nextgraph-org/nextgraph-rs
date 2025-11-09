import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Link,
  Card,
  CardContent,
} from '@mui/material';
import {
  UilEnvelope,
  UilLock,
  UilEye,
  UilEyeSlash,
  UilShield,
  UilKeySkeletonAlt,
  UilDatabase,
} from '@iconscout/react-unicons';

export const PersonalDataVaultPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    pin: '',
    pinEnabled: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (formData.pinEnabled && !formData.pin) {
      newErrors.pin = 'PIN is required when enabled';
    } else if (formData.pinEnabled && !/^\d{4,6}$/.test(formData.pin)) {
      newErrors.pin = 'PIN must be 4-6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      navigate('/onboarding/social-contract');
    } catch (error) {
      console.error('Vault setup failed:', error);
      setErrors({ submit: 'Setup failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
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
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary'
            }}
          >
            Welcome! Set up your personal data vault
          </Typography>
        </Box>

        {/* Educational Content */}
        <Card sx={{ mb: 4, backgroundColor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <UilShield size="32" color="currentColor" style={{ color: 'var(--mui-palette-primary-main)', marginRight: '16px' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                What is your personal data vault?
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your personal data vault is a secure, encrypted space that only you control. It's where all your NAO data is stored safely and privately.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <UilDatabase size="20" color="currentColor" style={{ color: 'var(--mui-palette-primary-main)', marginRight: '12px', marginTop: '4px' }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Complete Privacy
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your data is encrypted and stored locally. Only you have access.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <UilKeySkeletonAlt size="20" color="currentColor" style={{ color: 'var(--mui-palette-primary-main)', marginRight: '12px', marginTop: '4px' }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    You Own Your Data
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Take your data with you anywhere. No lock-in, full portability.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <UilShield size="20" color="currentColor" style={{ color: 'var(--mui-palette-primary-main)', marginRight: '12px', marginTop: '4px' }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Zero-Knowledge Security
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Even NAO can't see your data. Your vault, your control.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          {/* Email Field */}
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <UilEnvelope size="20" />
                </InputAdornment>
              ),
            }}
            placeholder="your.email@example.com"
          />

          {/* Password Field */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleInputChange('password')}
            error={!!errors.password}
            helperText={errors.password || 'Must be at least 8 characters'}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <UilLock size="20" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <UilEyeSlash size="20" /> : <UilEye size="20" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            placeholder="Choose a strong password"
          />

          {/* Submit Error */}
          {errors.submit && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.submit}
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isSubmitting}
            sx={{
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            {isSubmitting ? 'Setting up your vault...' : 'Create My Personal Data Vault'}
          </Button>

          {/* Login Link */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have a vault?{' '}
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
                sx={{ textDecoration: 'none', fontWeight: 600 }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};