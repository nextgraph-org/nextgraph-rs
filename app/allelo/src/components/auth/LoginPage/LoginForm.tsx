import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  UilEye,
  UilEyeSlash,
  UilEnvelope,
  UilLock,
} from '@iconscout/react-unicons';
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
              <UilEnvelope size="20" />
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
              <UilLock size="20" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={onShowPasswordToggle}
                edge="end"
                size="small"
              >
                {showPassword ? <UilEyeSlash size="20" /> : <UilEye size="20" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        placeholder="Enter your password"
      />
    </Box>
  );
};