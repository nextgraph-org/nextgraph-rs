import type { BoxProps } from '@mui/material';

export interface HeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  disabled?: boolean;
  loading?: boolean;
}

export interface PageHeaderProps extends BoxProps {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
  loading?: boolean;
}