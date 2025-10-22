import { forwardRef } from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';
import type { ButtonProps } from './types';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, loading = false, disabled, ...props }, ref) => {
    return (
      <MuiButton
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <CircularProgress
            size={20}
            color="inherit"
            sx={{ mr: 1 }}
          />
        ) : null}
        {children}
      </MuiButton>
    );
  }
);

Button.displayName = 'Button';