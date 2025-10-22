import {forwardRef} from 'react';
import {
  Typography,
  Box,
  Avatar,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  PersonAdd,
  PersonRemove,
} from '@mui/icons-material';
import {getContactPhotoStyles} from "@/utils/photoStyles";
import {formatDate} from "@/utils/dateHelpers";

// Note: Using standard avatar styling instead of getContactPhotoStyles

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: 'Admin' | 'Member';
  status?: 'Member' | 'Invited';
  joinedAt: Date | null;
}

export interface MembersListProps {
  members: Member[];
  isCurrentUserAdmin: boolean;
  onInviteMember: () => void;
  onRemoveMember: (member: Member) => void;
}

export const MembersList = forwardRef<HTMLDivElement, MembersListProps>(
  ({members, isCurrentUserAdmin, onInviteMember, onRemoveMember}, ref) => {

    return (
      <Card ref={ref}>
        <CardContent sx={{p: 3}}>
          <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
            <Typography variant="h6" sx={{fontWeight: 600}}>
              Members ({members.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<PersonAdd/>}
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
            {members.map((member, index) => (
              <ListItem
                key={member.id}
                sx={{
                  px: 0,
                  py: 1,
                  borderBottom: index === members.length - 1 ? 'none' : '1px solid',
                  borderColor: 'divider',
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={member.avatar}
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'white',
                      border: 1,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      backgroundSize: member.avatar ? getContactPhotoStyles(member.name).backgroundSize : 'cover',
                      backgroundPosition: member.avatar ? getContactPhotoStyles(member.name).backgroundPosition : 'center',
                    }}
                  >
                    {!member.avatar && member.name.split(' ').map(n => n[0]).join('')}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}>
                      <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                        <Typography variant="subtitle1" sx={{fontWeight: 600}}>
                          {member.name}
                        </Typography>
                        {member.role === 'Admin' && (
                          <Chip
                            label="Admin"
                            size="small"
                            color="primary"
                            sx={{height: 20, fontSize: '0.7rem'}}
                          />
                        )}
                      </Box>
                      <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                        {member.status && (
                          <Chip
                            label={member.status}
                            size="small"
                            color={member.status === 'Member' ? 'success' : 'warning'}
                            variant={member.status === 'Member' ? 'filled' : 'outlined'}
                            sx={{height: 20, fontSize: '0.7rem'}}
                          />
                        )}
                        {/* Remove member button - only show for admins and not for the admin themselves */}
                        {isCurrentUserAdmin && member.id !== 'oli-sb' && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<PersonRemove/>}
                            onClick={() => onRemoveMember(member)}
                            sx={{
                              height: 20,
                              fontSize: '0.6rem',
                              minWidth: 'auto',
                              px: 1,
                              py: 0,
                              borderColor: 'error.main',
                              color: 'error.main',
                              '&:hover': {
                                borderColor: 'error.dark',
                                backgroundColor: 'error.light'
                              }
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {member.status === 'Invited' ? 'Invitation sent' : `Joined ${member.joinedAt ? formatDate(member.joinedAt, {
                        month: "short",
                        hour: undefined,
                        minute: undefined
                      }) : 'Unknown'}`}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  }
);

MembersList.displayName = 'MembersList';