import {forwardRef} from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  List,
} from '@mui/material';
import {UilUserPlus} from '@iconscout/react-unicons';
import {MemberListItem} from './MemberListItem';

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: 'Admin' | 'Member';
  status?: 'Member' | 'Invited';
  joinedAt: Date | null;
}

export interface MembersListProps {
  membersNuris: string[];
  isCurrentUserAdmin: boolean;
  onInviteMember: () => void;
  onRemoveMember: (member: Member) => void;
}

export const MembersList = forwardRef<HTMLDivElement, MembersListProps>(
  ({membersNuris, isCurrentUserAdmin, onInviteMember, onRemoveMember}, ref) => {

    return (
      <Card ref={ref}>
        <CardContent sx={{p: 3}}>
          <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
            <Typography variant="h6" sx={{fontWeight: 600}}>
              Members ({membersNuris.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<UilUserPlus size="20"/>}
              onClick={onInviteMember}
              sx={{
                borderRadius: 2,
                px: {xs: 1.5, md: 3},
                py: {xs: 0.5, md: 1},
                fontSize: {xs: '0.75rem', md: '0.875rem'},
                flexShrink: 0,
                minWidth: {xs: 'auto', md: 'auto'}
              }}
            >
              Invite
            </Button>
          </Box>

          <List sx={{width: '100%'}}>
            {membersNuris.map((memberNuri, index) => (
              <MemberListItem
                key={memberNuri}
                memberNuri={memberNuri}
                isCurrentUserAdmin={isCurrentUserAdmin}
                isLastItem={index === membersNuris.length - 1}
                onRemoveMember={onRemoveMember}
              />
            ))}
          </List>
        </CardContent>
      </Card>
    );
  }
);

MembersList.displayName = 'MembersList';