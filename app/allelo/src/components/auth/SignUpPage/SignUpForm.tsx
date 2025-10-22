import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Pin,
} from '@mui/icons-material';
import type { SignUpFormProps } from './types';

export const SignUpForm = ({
  formData,
  errors,
  showPassword,
  onFormDataChange,
  onShowPasswordToggle,
}: SignUpFormProps) => {
  const handleInputChange = (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onFormDataChange(field, value);
  };

  return (
    <Box>
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
              <Email color="action" />
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
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={onShowPasswordToggle}
                edge="end"
                size="small"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        placeholder="Enter a strong password"
      />

      {/* PIN Field */}
      <TextField
        fullWidth
        label="Security PIN"
        type="password"
        value={formData.pin}
        onChange={handleInputChange('pin')}
        error={!!errors.pin}
        helperText={errors.pin || 'Used for additional security verification'}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Pin color="action" />
            </InputAdornment>
          ),
        }}
        placeholder="4-6 digit PIN"
        inputProps={{
          maxLength: 6,
          pattern: '[0-9]*',
          inputMode: 'numeric'
        }}
      />
    </Box>
  );
};