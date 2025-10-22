import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Chip
} from '@mui/material';
import {
  Group
} from '@mui/icons-material';
import type { Group as GroupType } from '@/types/group';

export interface ContactGroupsProps {
  groups: GroupType[];
}

export const ContactGroups = forwardRef<HTMLDivElement, ContactGroupsProps>(
  ({ groups }, ref) => {
    const navigate = useNavigate();

    if (groups.length === 0) return null;

    return (
      <Box ref={ref} sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Group sx={{ mr: 2, color: 'text.secondary' }} />
          <Box>
            <Typography variant="body2" color="text.secondary">
              Groups
            </Typography>
            <Typography variant="body1">
              Member of {groups.length} group{groups.length > 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {groups.map((group) => (
            <Chip
              key={group.id}
              label={group.name}
              size="small"
              variant="outlined"
              clickable
              onClick={() => navigate(`/groups/${group.id}`)}
              sx={{
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }
);

ContactGroups.displayName = 'ContactGroups';