import { CardProps as MuiCardProps } from '@mui/material/Card';
import { ReactNode } from 'react';

export interface CardProps extends MuiCardProps {
  children: ReactNode;
  loading?: boolean;
  hover?: boolean;
  padding?: number | string;
}

export interface CardHeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export interface CardActionsProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
}