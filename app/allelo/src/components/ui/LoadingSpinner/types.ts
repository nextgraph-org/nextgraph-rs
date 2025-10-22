import { CircularProgressProps } from '@mui/material/CircularProgress';
import { SxProps, Theme } from '@mui/material/styles';

export interface LoadingSpinnerProps extends Omit<CircularProgressProps, 'size'> {
  size?: number;
  message?: string;
  centered?: boolean;
  sx?: SxProps<Theme>;
}