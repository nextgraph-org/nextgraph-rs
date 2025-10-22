import { Box, CircularProgress, Typography } from '@mui/material';
import type { LoadingSpinnerProps } from './types';

export const LoadingSpinner = ({ 
  size = 40, 
  color = 'primary', 
  message, 
  centered = false,
  sx,
  ...props 
}: LoadingSpinnerProps) => {
  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={2}
      sx={sx}
    >
      <CircularProgress size={size} color={color} {...props} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (centered) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        {content}
      </Box>
    );
  }

  return content;
};