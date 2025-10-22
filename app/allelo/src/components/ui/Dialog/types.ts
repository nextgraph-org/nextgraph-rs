import { DialogProps as MuiDialogProps } from '@mui/material/Dialog';
import { ReactNode } from 'react';

export interface DialogProps extends Omit<MuiDialogProps, 'title'> {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export interface DialogHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
}

export interface DialogFooterProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
}