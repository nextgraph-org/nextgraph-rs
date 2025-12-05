import {forwardRef} from 'react';
import {
  Typography,
  Box,
} from '@mui/material';
import {
  UilUsersAlt as Group
} from '@iconscout/react-unicons';
import {ContactGroupChip} from "@/components/contacts/ContactGroups/ContactGroupChip.tsx";

export interface ContactGroupsProps {
  groupsNuris: string[];
}

export const ContactGroups = forwardRef<HTMLDivElement, ContactGroupsProps>(
  ({groupsNuris}, ref) => {
    if (groupsNuris.length === 0) return null;

    return (
      <Box ref={ref} sx={{mt: 2}}>
        <Box sx={{display: 'flex', alignItems: 'center', mb: 2}}>
          <Group sx={{mr: 2, color: 'text.secondary'}}/>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Groups
            </Typography>
            <Typography variant="body1">
              Member of {groupsNuris.length} group{groupsNuris.length > 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
        <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
          {groupsNuris.map((groupNuri) => (
            <ContactGroupChip groupNuri={groupNuri}/>
          ))}
        </Box>
      </Box>
    );
  }
);

ContactGroups.displayName = 'ContactGroups';