import { forwardRef } from 'react';
import { Box, Typography } from '@mui/material';
import { Button } from '@/components/ui';
import { AutoAwesome } from '@mui/icons-material';
import type { CollectionHeaderProps } from '../types';

export const CollectionHeader = forwardRef<HTMLDivElement, CollectionHeaderProps>(
  ({ onQueryClick }, ref) => {
    return (
      <Box ref={ref} sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            My Bookmarks
          </Typography>
          <Button
            variant="contained"
            startIcon={<AutoAwesome />}
            onClick={onQueryClick}
          >
            Query Collection
          </Button>
        </Box>
      </Box>
    );
  }
);

CollectionHeader.displayName = 'CollectionHeader';