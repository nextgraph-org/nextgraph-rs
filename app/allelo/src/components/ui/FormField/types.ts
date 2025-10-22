import { TextFieldProps } from '@mui/material/TextField';
import { ReactNode } from 'react';

export interface FormFieldProps extends Omit<TextFieldProps, 'helperText'> {
  label: string;
  error?: boolean;
  helperText?: ReactNode;
  required?: boolean;
  loading?: boolean;
}

export type FormFieldVariant = 'standard' | 'outlined' | 'filled';
export type FormFieldSize = 'small' | 'medium';