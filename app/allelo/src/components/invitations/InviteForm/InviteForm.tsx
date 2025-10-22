import { useState, useEffect, forwardRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { DEFAULT_RCARDS } from '@/types/notification';
import type { Group } from '@/types/group';
import { dataService } from '@/services/dataService';
import { ContactSelector } from './ContactSelector';
import type { InviteFormData, InviteFormState } from './types';
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";

export interface InviteFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (inviteData: InviteFormData) => void;
  onSelectFromNetwork: () => void;
  group: Group;
  inviteeNuri?: string;
  prefilledContact?: {
    name: string;
    email: string;
  };
}

export const InviteForm = forwardRef<HTMLDivElement, InviteFormProps>(
  ({
    open,
    onClose,
    onSubmit,
    onSelectFromNetwork,
    group,
    inviteeNuri,
    prefilledContact,
  }, ref) => {
    const [formData, setFormData] = useState<InviteFormState>({
      inviteeName: '',
      inviteeEmail: '',
      profileCardType: '',
      inviterName: 'Oli S-B',
    });

    useEffect(() => {
      if (prefilledContact) {
        setFormData(prev => ({
          ...prev,
          inviteeName: prefilledContact.name,
          inviteeEmail: prefilledContact.email
        }));
      }
    }, [prefilledContact]);

    useEffect(() => {
      if (inviteeNuri) {
        dataService.getContact(inviteeNuri).then(prefilledContact => {
          setFormData(prev => ({
            ...prev,
            inviteeName: resolveFrom(prefilledContact, "name")?.value || "",
            inviteeEmail: resolveFrom(prefilledContact, "email")?.value || "",
          }));
        });
      }
    }, [inviteeNuri]);

    const handleSubmit = () => {
      if (!formData.inviteeName || !formData.inviteeEmail) {
        return;
      }

      const defaultProfileCard = DEFAULT_RCARDS[0];
      
      if (formData.inviteeName && formData.inviteeEmail) {
        const inviteData: InviteFormData = {
          inviteeName: formData.inviteeName,
          inviteeEmail: formData.inviteeEmail,
          profileCardType: defaultProfileCard.name,
          profileCardData: {
            name: defaultProfileCard.name || 'Unknown',
            description: defaultProfileCard.description || 'No description',
            color: defaultProfileCard.color || '#2563eb',
            icon: defaultProfileCard.icon || 'PersonOutline',
          },
          relationshipType: defaultProfileCard.name,
          relationshipData: {
            name: defaultProfileCard.name || 'Unknown',
            description: defaultProfileCard.description || 'No description',
            color: defaultProfileCard.color || '#2563eb',
            icon: defaultProfileCard.icon || 'PersonOutline',
          },
          inviterName: formData.inviterName || 'Current User',
        };
        
        onSubmit(inviteData);
      }
    };

    return (
      <Dialog ref={ref} open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd />
            <Typography variant="h6">
              Invite Someone to {group.name}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3, pt: 2 }}>
          <ContactSelector onSelectFromNetwork={onSelectFromNetwork} />

          {/* Basic Info */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Who are you inviting?
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                sx={{ flex: 1 }}
                label="First Name"
                value={formData.inviteeName || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  inviteeName: e.target.value
                }))}
                required
              />
              <TextField
                sx={{ flex: 1 }}
                label="Email Address"
                type="email"
                value={formData.inviteeEmail || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  inviteeEmail: e.target.value
                }))}
                required
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.inviteeName || !formData.inviteeEmail}
          >
            Create Invite
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);

InviteForm.displayName = 'InviteForm';