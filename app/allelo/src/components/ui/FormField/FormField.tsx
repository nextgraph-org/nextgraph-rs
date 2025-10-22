import { forwardRef } from 'react';
import { TextField, CircularProgress, InputAdornment } from '@mui/material';
import type { FormFieldProps } from './types';

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ loading = false, error = false, helperText, InputProps, ...props }, ref) => {
    return (
      <TextField
        ref={ref}
        error={error}
        helperText={helperText}
        InputProps={{
          ...InputProps,
          endAdornment: loading ? (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          ) : InputProps?.endAdornment,
        }}
        {...props}
      />
    );
  }
);

FormField.displayName = 'FormField';