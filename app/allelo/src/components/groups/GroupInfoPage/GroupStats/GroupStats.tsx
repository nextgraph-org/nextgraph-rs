import { forwardRef } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
// Note: Using standard avatar styling instead of getContactPhotoStyles
import type { Group } from '@/types/group';

export interface GroupStatsProps {
  group: Group;
  memberCount: number;
}

export const GroupStats = forwardRef<HTMLDivElement, GroupStatsProps>(
  ({ group }, ref) => {
    const theme = useTheme();

    return (
      <Box ref={ref} sx={{ mb: 3 }}>
        {/* Group Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              About this group
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
              {group.description}
            </Typography>

            {group.tags && group.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {group.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderRadius: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      borderColor: alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                      fontWeight: 500,
                    }}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }
);

GroupStats.displayName = 'GroupStats';