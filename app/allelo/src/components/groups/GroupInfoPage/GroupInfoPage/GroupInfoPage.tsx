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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  UilArrowLeft as ArrowBack,
  UilSignOutAlt as ExitToApp,
  UilTrashAlt as Delete,
  UilFileAlt as Description,
  UilUsersAlt as People,
  UilShareAlt as Share,
  UilTimes as Close,
  UilEdit as Edit,
  UilCheck as Save,
  UilTimesCircle as Cancel,
} from '@iconscout/react-unicons';
import { dataService } from '@/services/dataService';
import type { Group } from '@/types/group';
import type { Contact } from '@/types/contact';
import { InviteForm, type InviteFormData } from '@/components/invitations/InviteForm';
import { GroupStats } from '../GroupStats';
import { EditableGroupStats } from '../EditableGroupStats';
import { MembersList } from '../MembersList';
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";

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

interface SharedFile {
  id: string;
  name: string;
  type: 'document' | 'spreadsheet' | 'image' | 'pdf';
  size: string;
  sharedAt: Date;
  sharedBy: string;
}

const getMockMembers = (): Member[] => [
  {
    id: 'oli-sb',
    name: 'Oliver Sylvester-Bradley',
    avatar: '/images/Oli.jpg',
    role: 'Admin',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365), // 1 year ago
  },
  {
    id: 'ruben-daniels',
    name: 'Ruben Daniels',
    avatar: '/images/Ruben.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 300), // 300 days ago
  },
  {
    id: 'margeigh-novotny',
    name: 'Margeigh Novotny',
    avatar: '/images/Margeigh.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 280), // 280 days ago
  },
  {
    id: 'alex-lion',
    name: 'Alex Lion Yes!',
    avatar: '/images/Alex.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 250), // 250 days ago
  },
  {
    id: 'day-waterbury',
    name: 'Day Waterbury',
    avatar: '/images/Day.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200), // 200 days ago
  },
  {
    id: 'kevin-triplett',
    name: 'Kevin Triplett',
    avatar: '/images/Kevin.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180), // 180 days ago
  },
  {
    id: 'tim-bansemer',
    name: 'Tim Bansemer',
    avatar: '/images/Tim.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 150), // 150 days ago
  },
  {
    id: 'aza-mafi',
    name: 'Aza Mafi',
    avatar: '/images/Aza.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120), // 120 days ago
  },
  {
    id: 'duke-dorje',
    name: 'Duke Dorje',
    avatar: '/images/Duke.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 100), // 100 days ago
  },
  {
    id: 'david-thomson',
    name: 'David Thomson',
    avatar: '/images/David.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 80), // 80 days ago
  },
  {
    id: 'samuel-gbafa',
    name: 'Samuel Gbafa',
    avatar: '/images/Sam.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60), // 60 days ago
  },
  {
    id: 'meena-seshamani',
    name: 'Meena Seshamani',
    avatar: '/images/Meena.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40), // 40 days ago
  },
  {
    id: 'niko-bonnieure',
    name: 'Niko Bonnieure',
    avatar: '/images/Niko.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
  },
  {
    id: 'tree-willard',
    name: 'Tree Willard',
    avatar: '/images/Tree.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20), // 20 days ago
  },
  {
    id: 'stephane-bancel',
    name: 'Stephane Bancel',
    avatar: '/images/Stephane.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // 15 days ago
  },
  {
    id: 'joscha-raue',
    name: 'Joscha Raue',
    avatar: '/images/Joscha.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
  },
  {
    id: 'drummond-reed',
    name: 'Drummond Reed',
    avatar: '/images/Drummond.jpg',
    role: 'Member',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
  },
];

const getMockSharedFiles = (): SharedFile[] => [
  {
    id: '1',
    name: 'Q3 Budget Report.xlsx',
    type: 'spreadsheet',
    size: '2.4 MB',
    sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    sharedBy: 'You',
  },
  {
    id: '2',
    name: 'Project Roadmap 2025.pdf',
    type: 'pdf',
    size: '1.8 MB',
    sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    sharedBy: 'You',
  },
  {
    id: '3',
    name: 'Meeting Notes - August.docx',
    type: 'document',
    size: '156 KB',
    sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    sharedBy: 'You',
  },
  {
    id: '4',
    name: 'Team Photo Summer 2025.jpg',
    type: 'image',
    size: '4.2 MB',
    sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
    sharedBy: 'You',
  },
  {
    id: '5',
    name: 'Workshop Presentation.pdf',
    type: 'pdf',
    size: '8.7 MB',
    sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // 15 days ago
    sharedBy: 'You',
  },
];

export const GroupInfoPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [group, setGroup] = useState<ExtendedGroup | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
  const [tabValue, setTabValue] = useState(0);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedGroup, setEditedGroup] = useState<ExtendedGroup | null>(null);


  useEffect(() => {
    const loadGroupData = async () => {
      if (!groupId) return;
      
      setIsLoading(true);
      try {
        const groupData = await dataService.getGroup(groupId);
        if (groupData) {
          setGroup(groupData);
          setMembers(getMockMembers());
          setSharedFiles(getMockSharedFiles());
        }
      } catch (error) {
        console.error('Failed to load group:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGroupData();
  }, [groupId]);

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
          message: `You have left ${group?.name}` 
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
      console.log(`🚫 Removed ${memberToRemove.name} from group "${group?.name}"`);
      setShowRemoveMemberDialog(false);
      setMemberToRemove(null);
    }
  };

  const isCurrentUserAdmin = () => {
    return true;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === sharedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(sharedFiles.map(f => f.id)));
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setSharedFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  };

  const handleRemoveSelected = () => {
    setSharedFiles(prev => prev.filter(f => !selectedFiles.has(f.id)));
    setSelectedFiles(new Set());
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
      setGroup(editedGroup);
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
          src={group.image}
          alt={group.name}
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
          {group.name.charAt(0)}
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
                {group.name}
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<People />} label="Members" />
          <Tab icon={<Share />} label="Shared with group" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <>
          {/* Group Stats - Editable or Read-only */}
          {isEditMode && editedGroup ? (
            <EditableGroupStats 
              group={editedGroup} 
              onChange={handleGroupFieldChange}
            />
          ) : (
            <GroupStats group={group} memberCount={members.length} />
          )}

          {/* Members List */}
          <MembersList
            members={members}
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

      {tabValue === 1 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            {/* Header with select all and bulk remove */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Checkbox
                  checked={selectedFiles.size === sharedFiles.length && sharedFiles.length > 0}
                  indeterminate={selectedFiles.size > 0 && selectedFiles.size < sharedFiles.length}
                  onChange={handleSelectAll}
                />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Files shared with this group ({sharedFiles.length})
                </Typography>
              </Box>
              {selectedFiles.size > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleRemoveSelected}
                  size="small"
                >
                  Remove {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''}
                </Button>
              )}
            </Box>

            {/* File List */}
            {sharedFiles.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No files shared yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Files you share with this group will appear here
                </Typography>
              </Box>
            ) : (
              <List sx={{ width: '100%' }}>
                {sharedFiles.map((file, index) => (
                  <ListItem
                    key={file.id}
                    sx={{
                      px: 0,
                      py: 1,
                      borderBottom: index === sharedFiles.length - 1 ? 'none' : '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox
                        edge="start"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => handleFileSelect(file.id)}
                      />
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveFile(file.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 48 }}>
                      <Description sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {file.name}
                          </Typography>
                          <Chip
                            label={file.type}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {file.size} • Shared {file.sharedAt.toLocaleDateString()} by {file.sharedBy}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {group && (
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
      )}

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
            Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from the <strong>{group?.name}</strong> group?
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