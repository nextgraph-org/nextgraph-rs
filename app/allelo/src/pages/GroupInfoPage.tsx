import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions, 
  Avatar, 
} from '@mui/material';
import {
  UilArrowLeft as ArrowBack,
  UilSignOutAlt as ExitToApp,
  UilTimes as Close,
  UilEdit as Edit,
  UilCheck as Save,
  UilTimesCircle as Cancel,
} from '@iconscout/react-unicons';
import { dataService } from '@/services/dataService';
import type { Group } from '@/types/group';
import type { Contact } from '@/types/contact';
import { type InviteFormData } from '@/components/invitations/InviteForm';
import {GroupStats, MembersList} from "@/components/groups";
import {EditableGroupStats} from "@/components/groups/GroupInfoPage/EditableGroupStats";
import {useGroupData} from "@/hooks/groups/useGroupData.ts";

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: 'Admin' | 'Member';
  status?: 'Member' | 'Invited';
  joinedAt: Date | null;
}

interface ExtendedGroup extends Group {
  memberDetails?: Member[];
}

export const GroupInfoPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { group} = useGroupData(groupId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedGroup, setEditedGroup] = useState<ExtendedGroup | null>(null);


  useEffect(() => {
    const selectedContactNuri = searchParams.get('selectedContact');
    if (selectedContactNuri) {
      const loadSelectedContact = async () => {
        try {
          const contact = await dataService.getContact(selectedContactNuri);
          if (contact) {
            setSelectedContact(contact);
            setShowInviteForm(true);
          }
        } catch (error) {
          console.error('Failed to load selected contact:', error);
        }
      };
      loadSelectedContact();
    }
  }, [searchParams]);

  const handleBack = () => {
    navigate('/groups');
  };

  const handleClose = () => {
    // Navigate to the group detail page instead of groups list
    navigate(`/groups/${groupId}`);
  };

  const handleInviteMember = () => {
    navigate(`/contacts?mode=invite&returnTo=group-info&groupId=${groupId}`);
  };

  const handleInviteSubmit = (inviteData: InviteFormData) => {
    const inviteParams = new URLSearchParams();
    inviteParams.set('groupId', groupId || '');
    inviteParams.set('inviterName', inviteData.inviterName);
    if (inviteData.relationshipType) {
      inviteParams.set('relationshipType', inviteData.relationshipType);
    }
    if (inviteData.profileCardType) {
      inviteParams.set('profileCardType', inviteData.profileCardType);
    }
    
    setShowInviteForm(false);
    navigate(`/invite?${inviteParams.toString()}`);
  };

  const handleSelectFromNetwork = () => {
    setShowInviteForm(false);
    navigate(`/contacts?mode=select&returnTo=group-info&groupId=${groupId}`);
  };

  const handleLeaveGroup = () => {
    setShowLeaveDialog(true);
  };

  const handleConfirmLeave = async () => {
    try {
      console.log('Leaving group:', groupId);
      setShowLeaveDialog(false);
      navigate('/groups', { 
        state: { 
          removedGroupId: groupId,
          message: `You have left ${group?.title}`
        }
      });
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const handleRemoveMember = (member: Member) => {
    setMemberToRemove(member);
    setShowRemoveMemberDialog(true);
  };

  const handleConfirmRemoveMember = () => {
    if (memberToRemove) {
      setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
      console.log(`🚫 Removed ${memberToRemove.name} from group "${group?.title}"`);
      setShowRemoveMemberDialog(false);
      setMemberToRemove(null);
    }
  };

  const isCurrentUserAdmin = () => {
    return true;
  };

  const handleEditToggle = () => {
    if (!isEditMode) {
      setEditedGroup(group);
      setIsEditMode(true);
    } else {
      // Cancel edit
      setEditedGroup(null);
      setIsEditMode(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editedGroup) {
      // In a real app, this would save to the backend
      setIsEditMode(false);
      console.log('Saving group changes:', editedGroup);
    }
  };

  const handleGroupFieldChange = (field: keyof Group, value: unknown) => {
    if (editedGroup) {
      setEditedGroup({
        ...editedGroup,
        [field]: value
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="text.secondary">
          Loading group...
        </Typography>
      </Box>
    );
  }

  if (!group) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="text.secondary">
          Group not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 2 },
        mb: { xs: 2, md: 3 },
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        minWidth: 0
      }}>
        <IconButton onClick={handleBack} size="large" sx={{ flexShrink: 0 }}>
          <ArrowBack />
        </IconButton>
        <Avatar
         /* src={group.image}
          alt={group.name}*/
          sx={{
            width: { xs: 48, md: 64 },
            height: { xs: 48, md: 64 },
            bgcolor: 'white',
            border: 1,
            borderColor: 'primary.main',
            color: 'primary.main',
            flexShrink: 0
          }}
        >
          {group.title.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', md: '2.125rem' },
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {group.title}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          {/* Edit/Save/Cancel buttons for admins */}
          {isCurrentUserAdmin() && (
            <>
              {!isEditMode ? (
                <IconButton 
                  onClick={handleEditToggle} 
                  size="large" 
                  sx={{ 
                    border: 1,
                    borderColor: 'primary.main',
                    borderRadius: 2,
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      borderColor: 'primary.dark',
                    }
                  }}
                >
                  <Edit />
                </IconButton>
              ) : (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Save />}
                    onClick={handleSaveEdit}
                    sx={{ borderRadius: 2 }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={handleEditToggle}
                    sx={{ borderRadius: 2 }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </>
          )}
          
          {/* Close button */}
          <IconButton 
            onClick={handleClose} 
            size="large" 
            sx={{ 
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: 'action.hover',
                borderColor: 'action.disabled',
              }
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </Box>

      {/* Tab Content */}
      {(
        <>
          {/* Group Stats - Editable or Read-only */}
          {isEditMode && editedGroup ? (
            <EditableGroupStats 
              group={editedGroup} 
              onChange={handleGroupFieldChange}
            />
          ) : (
            <GroupStats group={group} memberCount={group.hasMember?.size || 0} />
          )}

          {/* Members List */}
          <MembersList
            members={group.hasMember}
            isCurrentUserAdmin={isCurrentUserAdmin()}
            onInviteMember={handleInviteMember}
            onRemoveMember={handleRemoveMember}
          />

          {/* Leave Group Button - positioned below members list */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ExitToApp />}
              onClick={handleLeaveGroup}
              size="large"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                borderColor: 'error.main',
                color: 'error.main',
                fontSize: '0.875rem',
                px: 4,
                py: 1.5,
                '&:hover': {
                  borderColor: 'error.dark',
                  backgroundColor: 'error.light',
                  color: 'error.dark'
                }
              }}
            >
              Leave Group
            </Button>
          </Box>
        </>
      )}

      {/* Dialogs */}
{/*TODO:      {group && (
        <InviteForm
          open={showInviteForm}
          onClose={() => {
            setShowInviteForm(false);
            setSelectedContact(undefined);
          }}
          onSubmit={handleInviteSubmit}
          onSelectFromNetwork={handleSelectFromNetwork}
          group={group}
          prefilledContact={{
            name: resolveFrom(selectedContact, "name")?.value || "",
            email: resolveFrom(selectedContact, "email")?.value || ""
          }}
        />
      )}*/}

      <Dialog open={showLeaveDialog} onClose={() => setShowLeaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Leave Group</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            You will no longer have access to group posts and discussions. You can rejoin later if invited.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLeaveDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleConfirmLeave} variant="contained" color="error" sx={{ ml: 1 }}>
            Leave Group
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showRemoveMemberDialog} onClose={() => setShowRemoveMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from the <strong>{group?.title}</strong> group?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            They will lose access to group posts and discussions. You can invite them back later if needed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRemoveMemberDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleConfirmRemoveMember} variant="contained" color="error" sx={{ ml: 1 }}>
            Remove Member
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};