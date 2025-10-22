import { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import { ReactNode } from 'react';

export interface ButtonProps extends Omit<MuiButtonProps, 'children'> {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export type ButtonVariant = 'text' | 'outlined' | 'contained';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';