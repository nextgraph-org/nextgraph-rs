import { Box, Typography } from '@mui/material';
import { LocationOn } from '@mui/icons-material';

export const EmptyState = () => {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        bgcolor: 'grey.50',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <LocationOn sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Location Data Available
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Contact locations will appear here when available
      </Typography>
    </Box>
  );
};