import {useCallback, useState} from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {ContactListTab} from '@/components/contacts/ContactListTab/ContactListTab';

export interface AddMembersDialogProps {
  open: boolean;
  onClose: () => void;
  onAddMembers: (selectedContacts: string[]) => void;
}

export const AddMembersDialog = ({open, onClose, onAddMembers}: AddMembersDialogProps) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [, setManageMode] = useState(true);

  const handleCloseDialog = useCallback(() => {
    onClose();
    setSelectedContacts([]);
    setManageMode(false);
  }, [onClose]);

  const handleSelectionChange = useCallback((contacts: string[]) => {
    setSelectedContacts(contacts);
  }, []);

  const handleAddMembers = useCallback(async () => {
    onAddMembers(selectedContacts);
    handleCloseDialog();
  }, [onAddMembers, selectedContacts, handleCloseDialog]);

  return (
    <Dialog
      open={open}
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
          Add Members
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
  );
};