import {useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  UilArrowLeft as ArrowBack,
  UilSignOutAlt as ExitToApp,
  UilTimes as Close,
  UilEdit as Edit,
} from '@iconscout/react-unicons';
import {GroupStats, MembersList} from "@/components/groups";
import {EditableGroupStats} from "@/components/groups/GroupInfoPage/EditableGroupStats";
import {useGroupData} from "@/hooks/groups/useGroupData.ts";
import {GroupAvatarUpload} from "@/components/groups/GroupAvatarUpload";

export const GroupInfoPage = () => {
  const {groupId} = useParams<{ groupId: string }>();
  const {group, isAdmin} = useGroupData(groupId);
  const navigate = useNavigate();

  const [isLoading,] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);


  const handleBack = () => {
    navigate('/groups');
  };

  const handleClose = () => {
    // Navigate to the group detail page instead of groups list
    navigate(`/groups/${groupId}`);
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

  const handleEditToggle = () => {
    if (!isEditMode) {
      setIsEditMode(true);
    } else {
      setIsEditMode(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh'}}>
        <Typography variant="h6" color="text.secondary">
          Loading group...
        </Typography>
      </Box>
    );
  }

  if (!group) {
    return (
      <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh'}}>
        <Typography variant="h6" color="text.secondary">
          Group not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{height: '100%', width: '100%', p: {xs: 0, md: 3}}}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: {xs: 1, md: 2},
        mb: {xs: 2, md: 3},
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        minWidth: 0
      }}>
        <IconButton onClick={handleBack} size="large" sx={{flexShrink: 0}}>
          <ArrowBack/>
        </IconButton>
        <GroupAvatarUpload size={{xs: 48, sm: 64}} initial={group.title} groupNuri={group["@graph"]} isEditing={false}/>
        <Box sx={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
          <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1}}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: {xs: '1.5rem', md: '2.125rem'},
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
        <Box sx={{display: 'flex', gap: 1, flexShrink: 0}}>
          {/* Edit/Save/Cancel buttons for admins */}
          {isAdmin && (
            <IconButton
              onClick={handleEditToggle}
              size="large"
              sx={{
                border: 1,
                borderColor: 'primary.main',
                backgroundColor: isEditMode ? 'primary.light' : undefined,
                borderRadius: 2,
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  borderColor: 'primary.dark',
                }
              }}
            >
              <Edit/>
            </IconButton>
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
            <Close/>
          </IconButton>
        </Box>
      </Box>

      {/* Tab Content */}
      {(
        <>
          {/* Group Stats - Editable or Read-only */}
          {isEditMode ? (
            <EditableGroupStats
              group={group}
            />
          ) : (
            <GroupStats group={group} memberCount={group.hasMember?.size || 0}/>
          )}

          {/* Members List */}
          <MembersList
            groupId={groupId!}
            groupMembers={group.hasMember}
            isCurrentUserAdmin={isAdmin}
          />

          {/* Leave Group Button - positioned below members list */}
          {!isAdmin && <Box sx={{mt: 3, display: 'flex', justifyContent: 'center'}}>
              <Button
                  variant="outlined"
                  color="error"
                  startIcon={<ExitToApp/>}
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
          </Box>}
        </>
      )}

      <Dialog open={showLeaveDialog} onClose={() => setShowLeaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Leave Group</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>
            You will no longer have access to group posts and discussions. You can rejoin later if invited.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLeaveDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleConfirmLeave} variant="contained" color="error" sx={{ml: 1}}>
            Leave Group
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};