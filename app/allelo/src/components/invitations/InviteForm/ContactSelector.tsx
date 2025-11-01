import { forwardRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import { UilUserCheck as ContactPage } from '@iconscout/react-unicons';

export interface ContactSelectorProps {
  onSelectFromNetwork: () => void;
}

export const ContactSelector = forwardRef<HTMLDivElement, ContactSelectorProps>(
  ({ onSelectFromNetwork }, ref) => {
    const theme = useTheme();

    return (
      <Box ref={ref}>
        {/* Network Selection Option */}
        <Box sx={{ mb: 3, mt: 2, textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ContactPage />}
            onClick={onSelectFromNetwork}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              py: 1.5,
              px: 3,
              borderColor: 'primary.main',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: theme.shadows[4],
              },
            }}
          >
            Select from your network
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Choose from your existing contacts to invite
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            or enter manually
          </Typography>
        </Divider>
      </Box>
    );
  }
);

ContactSelector.displayName = 'ContactSelector';