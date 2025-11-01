import { forwardRef } from 'react';
import {
  Typography,
  Box,
  Avatar,
  Chip,
} from '@mui/material';
import { UilUsersAlt } from '@iconscout/react-unicons';
import type { Group } from '@/types/group';

export interface InvitationDetailsProps {
  personalizedInvite: {
    inviteeName?: string;
    inviterName?: string;
    relationshipType?: string;
  };
  group: Group | null;
  isGroupInvite: boolean;
}

export const InvitationDetails = forwardRef<HTMLDivElement, InvitationDetailsProps>(
  ({ personalizedInvite, group, isGroupInvite }, ref) => {
    return (
      <Box ref={ref} sx={{ textAlign: 'center', mb: 4 }}>
        {isGroupInvite && (
          <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 3 }}>
            {personalizedInvite.inviteeName
              ? `Invite ${personalizedInvite.inviteeName} to ${group?.name}`
              : `Invite to ${group?.name}`
            }
          </Typography>
        )}
        
        {!isGroupInvite && (
          <Typography variant="h3" component="h1" gutterBottom>
            {personalizedInvite.inviteeName 
              ? `Invite ${personalizedInvite.inviteeName} to Your Network`
              : 'Invite to Your Network'
            }
          </Typography>
        )}
        
        {isGroupInvite && group && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <Avatar
              src={group.image}
              alt={group.name}
              sx={{ 
                width: 64, 
                height: 64, 
                bgcolor: 'white',
                border: 1,
                borderColor: 'primary.main',
                color: 'primary.main'
              }}
            >
              <UilUsersAlt size="20" />
            </Avatar>
            <Box>
              {group.isPrivate && (
                <Chip label="Private Group" size="small" variant="outlined" />
              )}
            </Box>
          </Box>
        )}
      </Box>
    );
  }
);

InvitationDetails.displayName = 'InvitationDetails';