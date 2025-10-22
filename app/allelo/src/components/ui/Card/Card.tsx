import { forwardRef } from 'react';
import { Card as MuiCard, CardContent, Skeleton } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { CardProps } from './types';

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, loading = false, hover = false, padding, sx, ...props }, ref) => {
    const theme = useTheme();
    
    if (loading) {
      return (
        <MuiCard ref={ref} sx={sx} {...props}>
          <CardContent sx={{ p: padding }}>
            <Skeleton variant="rectangular" height={60} />
          </CardContent>
        </MuiCard>
      );
    }

    return (
      <MuiCard
        ref={ref}
        sx={{
          ...(hover && {
            '&:hover': {
              boxShadow: theme.shadows[8],
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
            },
            transition: theme.transitions.create(['box-shadow', 'background-color'], {
              duration: theme.transitions.duration.short,
            }),
          }),
          ...sx,
        }}
        {...props}
      >
        <CardContent sx={{ p: padding }}>
          {children}
        </CardContent>
      </MuiCard>
    );
  }
);

Card.displayName = 'Card';