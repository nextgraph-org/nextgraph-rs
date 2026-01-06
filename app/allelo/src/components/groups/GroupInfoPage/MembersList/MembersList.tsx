import {forwardRef, useCallback, useState} from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  List,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {UilUserPlus} from '@iconscout/react-unicons';
import {MemberListItem} from './MemberListItem';
import {AddMembersDialog} from './AddMembersDialog';
import {useGroupData} from '@/hooks/groups/useGroupData';
import {GroupMembership} from "@/.orm/shapes/group.typings.ts";

export interface MembersListProps {
  groupId: string;
  groupMembers: Set<GroupMembership> | undefined;
  isCurrentUserAdmin: boolean;
}

export const MembersList = forwardRef<HTMLDivElement, MembersListProps>(
  ({groupId, groupMembers, isCurrentUserAdmin}, ref) => {
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
    const [removedContactName, setRemovedContactName] = useState("");
    const [removedContactNuri, setRemovedContactNuri] = useState("");

    const {addMembers, removeMember, group} = useGroupData(groupId);

    const onInviteMember = useCallback(() => {
      setIsInviteDialogOpen(true);
    }, []);

    const handleCloseDialog = useCallback(() => {
      setIsInviteDialogOpen(false);
    }, []);

    const handleAddMembers = useCallback(async (selectedContacts: string[]) => {
      addMembers(selectedContacts);
    }, [addMembers]);

    const handleRemoveMember = useCallback((nuri: string, name: string) => {
      setRemovedContactName(name);
      setShowRemoveMemberDialog(true);
      setRemovedContactNuri(nuri);
    }, []);

    const handleConfirmRemoveMember = () => {
      if (removedContactNuri) {
        setShowRemoveMemberDialog(false);
        removeMember(removedContactNuri);
        setRemovedContactNuri("");
      }
    };

    return (
      <>
        <Card ref={ref}>
          <CardContent sx={{p: 3}}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
              <Typography variant="h6" sx={{fontWeight: 600}}>
                Members ({groupMembers?.size || 0})
              </Typography>
              {isCurrentUserAdmin && <Button
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
              </Button>}
            </Box>

            <List sx={{width: '100%'}}>
              {([...(groupMembers ?? [])]).map((member, index) => (
                <MemberListItem
                  key={member["@id"]}
                  member={member}
                  isCurrentUserAdmin={isCurrentUserAdmin}
                  isLastItem={index === (groupMembers?.size || 1) - 1}
                  onRemoveMember={handleRemoveMember}
                />
              ))}
            </List>
          </CardContent>
        </Card>

        <AddMembersDialog
          open={isInviteDialogOpen}
          onClose={handleCloseDialog}
          onAddMembers={handleAddMembers}
        />

        <Dialog open={showRemoveMemberDialog} onClose={() => setShowRemoveMemberDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to remove <strong>{removedContactName}</strong> from
              the <strong>{group?.title}</strong> group?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>
              They will lose access to group posts and discussions. You can invite them back later if needed.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRemoveMemberDialog(false)} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleConfirmRemoveMember} variant="contained" color="error" sx={{ml: 1}}>
              Remove Member
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
);

MembersList.displayName = 'MembersList';