import { forwardRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography
} from '@mui/material';
import {
  UilPlus,
  UilShieldCheck,
  UilSearchAlt
} from '@iconscout/react-unicons';
import type { Contact } from '@/types/contact';

export interface ContactActionsProps {
  contact?: Contact | null;
  onInviteToNAO?: () => void;
  onConfirmHumanity?: () => void;
}

export const ContactActions = forwardRef<HTMLDivElement, ContactActionsProps>(
  ({ contact, onInviteToNAO, onConfirmHumanity }, ref) => {
    const [humanityDialogOpen, setHumanityDialogOpen] = useState(false);

    if (!contact) return null;


    const handleConfirmHumanity = () => {
      setHumanityDialogOpen(false);
      onConfirmHumanity?.();
    };

    return (
      <Box ref={ref}>
        {/* Main Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          {contact.naoStatus?.value === 'not_invited' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<UilPlus size="20" />}
              onClick={onInviteToNAO}
            >
              Invite to NAO
            </Button>
          )}
        </Box>

        {/* Humanity Confirmation Dialog */}
        <Dialog
          open={humanityDialogOpen}
          onClose={() => setHumanityDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UilSearchAlt size="24" color="primary" />
            Human Verification Confirmation
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              I confirm that I have met this person and that they are human
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This will set their humanity confidence score to level 5 (Verified Human) and indicates 
              you have had direct, in-person confirmation of their identity.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setHumanityDialogOpen(false)}
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmHumanity}
              variant="contained"
              color="primary"
              startIcon={<UilShieldCheck size="20" />}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
);

ContactActions.displayName = 'ContactActions';