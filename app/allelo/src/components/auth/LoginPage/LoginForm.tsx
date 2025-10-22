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
} from '@mui/icons-material';
import type { LoginFormProps } from './types';

export const LoginForm = ({
  formData,
  errors,
  showPassword,
  onFormDataChange,
  onShowPasswordToggle,
}: LoginFormProps) => {
  const handleInputChange = (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onFormDataChange(field, event.target.value);
  };

  return (
    <Box>
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

      <TextField
        fullWidth
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        error={!!errors.password}
        helperText={errors.password}
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
        placeholder="Enter your password"
      />
    </Box>
  );
};