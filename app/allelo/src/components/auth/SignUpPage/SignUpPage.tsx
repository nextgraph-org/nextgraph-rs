import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Link,
} from '@mui/material';
import { SignUpForm } from './SignUpForm';
import { AccountVerification } from './AccountVerification';
import type { SignUpFormData } from './types';

export const SignUpPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    pin: '',
    agreedToContract: false
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
    
    if (!formData.pin) {
      newErrors.pin = 'PIN is required';
    } else if (!/^\d{4,6}$/.test(formData.pin)) {
      newErrors.pin = 'PIN must be 4-6 digits';
    }
    
    if (!formData.agreedToContract) {
      newErrors.contract = 'You must agree to the social contract to continue';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormDataChange = (field: keyof SignUpFormData, value: string | boolean) => {
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
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Account creation data:', formData);
      navigate('/import');
    } catch (error) {
      console.error('Account creation failed:', error);
      setErrors({ submit: 'Account creation failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContractDetailsClick = () => {
    console.log('Open social contract details');
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
          maxWidth: { xs: 440, md: 600 },
          p: { xs: 3, sm: 4, md: 5 },
          borderRadius: 3,
          backgroundColor: 'background.paper'
        }}
      >
        {/* Image Space */}
        <Box
          sx={{
            width: '100%',
            height: { xs: 120, md: 150 },
            backgroundColor: 'grey.100',
            borderRadius: 2,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed',
            borderColor: 'grey.300'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            NAO Welcome Image
          </Typography>
        </Box>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 1,
              color: 'primary.main'
            }}
          >
            Create Account
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Join the NAO network and start building meaningful connections
          </Typography>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <SignUpForm
            formData={formData}
            errors={errors}
            showPassword={showPassword}
            onFormDataChange={handleFormDataChange}
            onShowPasswordToggle={() => setShowPassword(!showPassword)}
          />

          {/* Account Verification */}
          <AccountVerification
            agreedToContract={formData.agreedToContract}
            contractError={errors.contract}
            onAgreementChange={(agreed) => handleFormDataChange('agreedToContract', agreed)}
            onContractDetailsClick={handleContractDetailsClick}
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
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>

          {/* Login Link */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
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