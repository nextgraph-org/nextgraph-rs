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
import { LoginForm } from './LoginForm';
import type { LoginFormData } from './types';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
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
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormDataChange = (field: keyof LoginFormData, value: string) => {
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
      console.log('Login data:', formData);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      setErrors({ submit: 'Login failed. Please check your credentials.' });
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
          maxWidth: { xs: 400, md: 500 },
          p: { xs: 3, sm: 4, md: 5 },
          borderRadius: 3,
          backgroundColor: 'background.paper'
        }}
      >
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
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to your NAO account
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <LoginForm
            formData={formData}
            errors={errors}
            showPassword={showPassword}
            onFormDataChange={handleFormDataChange}
            onShowPasswordToggle={() => setShowPassword(!showPassword)}
          />

          {errors.submit && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.submit}
            </Alert>
          )}

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
              borderRadius: 2,
              mb: 3
            }}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/signup');
                }}
                sx={{ textDecoration: 'none', fontWeight: 600 }}
              >
                Create Account
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};