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
import {ContactListTab} from '@/components/contacts/ContactListTab/ContactListTab';
import {useGroupData} from '@/hooks/groups/useGroupData';

export interface MembersListProps {
  groupId: string;
  membersNuris: Set<string> | undefined;
  adminsNuris: Set<string> | undefined;
  isCurrentUserAdmin: boolean;
}

export const MembersList = forwardRef<HTMLDivElement, MembersListProps>(
  ({groupId, membersNuris, isCurrentUserAdmin, adminsNuris}, ref) => {
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [, setManageMode] = useState(true);
    const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
    const [removedContactName, setRemovedContactName] = useState("");
    const [removedContactNuri, setRemovedContactNuri] = useState("");

    const {addMembers, removeMember, group} = useGroupData(groupId);

    const onInviteMember = useCallback(() => {
      setIsInviteDialogOpen(true);
    }, []);

    const handleCloseDialog = useCallback(() => {
      setIsInviteDialogOpen(false);
      setSelectedContacts([]);
      setManageMode(false);
    }, []);

    const handleSelectionChange = useCallback((contacts: string[]) => {
      setSelectedContacts(contacts);
    }, []);

    const handleAddMembers = useCallback(async () => {
      addMembers(selectedContacts);
      handleCloseDialog();
    }, [addMembers, selectedContacts, handleCloseDialog]);

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
                Members ({membersNuris?.size || 0})
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
              {([...(membersNuris ?? [])]).map((memberNuri, index) => (
                <MemberListItem
                  key={memberNuri}
                  memberNuri={memberNuri}
                  isCurrentUserAdmin={isCurrentUserAdmin}
                  isMemberAdmin={[...adminsNuris ?? []].includes(memberNuri)}
                  isLastItem={index === (membersNuris?.size || 1) - 1}
                  onRemoveMember={handleRemoveMember}
                />
              ))}
            </List>
          </CardContent>
        </Card>

        <Dialog
          open={isInviteDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              p: 1
            }
          }}
        >
          <DialogTitle>
            <Typography variant="h6" sx={{fontWeight: 600}}>
              Add Members
            </Typography>
          </DialogTitle>
          <DialogContent sx={{p: 0, display: 'flex', flexDirection: 'column'}}>
            <Box sx={{flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
              <ContactListTab
                manageMode={true}
                setManageMode={setManageMode}
                onSelectionChange={handleSelectionChange}
                forGroup={true}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{px: 3, py: 1, gap: 1}}>
            <Button onClick={handleCloseDialog} variant="outlined" sx={{p: 1}}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              variant="contained"
              disabled={selectedContacts.length === 0}
              sx={{p: 1}}
            >
              Add {selectedContacts.length > 0 ? `(${selectedContacts.length})` : ''} Members
            </Button>
          </DialogActions>
        </Dialog>

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