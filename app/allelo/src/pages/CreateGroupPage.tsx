import {useState, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import {
  UilArrowLeft,
  UilUsersAlt,
  UilUser,
} from '@iconscout/react-unicons';
import {useSaveGroups} from "@/hooks/groups/useSaveGroups.ts";
import {SocialGroup} from "@/.orm/shapes/group.typings.ts";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {Tags} from "@/components/ui/Tags";
import {AddMembersDialog} from "@/components/groups/GroupInfoPage/MembersList/AddMembersDialog";

interface GroupFormData {
  title: string;
  description: string;
  logo: File | null;
  logoPreview: string;
  tags: string[];
}

const CreateGroupPage = () => {
  const navigate = useNavigate();
  // const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    title: '',
    description: '',
    logo: null,
    logoPreview: '',
    tags: []
  });
  const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const {createGroup} = useSaveGroups();
  const {ormContact} = useContactOrm(undefined, true);

  const handleBack = () => {
    navigate('/groups');
  };

  const handleOpenMembersDialog = useCallback(() => {
    // Validate form before proceeding
    if (!formData.title.trim()) {
      return; // TODO: Show validation error
    }
    setIsAddMembersDialogOpen(true);
  }, [formData.title]);

  const handleCloseMembersDialog = useCallback(() => {
    setIsAddMembersDialogOpen(false);
  }, []);

  const handleAddMembers = useCallback((members: string[]) => {
    setSelectedMembers(members);
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!ormContact) {
      return;
    }
    // Validate form before proceeding
    if (!formData.title.trim()) {
      return; // TODO: Show validation error
    }

    // Combine current user with selected members
    const allMembers = new Set([ormContact["@id"]!, ...selectedMembers]);

    const groupObj: Partial<SocialGroup> = {
      title: formData.title,
      description: formData.description,
      createdAt: new Date().toISOString(),
      hasAdmin: new Set([ormContact["@id"]!]),
      hasMember: allMembers,
      tag: new Set(formData["tags"])
    }

    const socialGroupId = await createGroup(groupObj);
    
    
    if (socialGroupId) {
      navigate(`/groups/${socialGroupId}`);
    }
  }, [ormContact, formData, selectedMembers, createGroup, navigate]);

  const handleInputChange = (field: keyof GroupFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

/*  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          logo: file,
          logoPreview: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };*/

  const handleTagAdd = useCallback((tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tag]
    }));
  }, []);

  const handleTagRemove = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);

  return (
    <Box sx={{
      width: '100%',
      maxWidth: {xs: '100vw', md: '800px'},
      mx: 'auto',
      pt: {xs: 1.5, md: 2},
      pb: 0,
    }}>
      {/* Header */}
      <Box sx={{
        mb: {xs: 2, md: 3},
        px: {xs: '10px', md: 0}
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: {xs: 1, md: 2},
          mb: {xs: 2, md: 3}
        }}>
          <IconButton onClick={handleBack} size="large" sx={{flexShrink: 0}}>
            <UilArrowLeft size="24"/>
          </IconButton>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: {xs: '1.5rem', md: '2.125rem'}
            }}
          >
            Create New Group
          </Typography>
        </Box>

      </Box>

      {/* Form Content */}
      <Box sx={{px: 0}}>
        <Card>
          <CardContent sx={{p: 1}}>
            <Typography variant="h6" sx={{fontWeight: 600, mb: 3}}>
              Group Information
            </Typography>

            {/* Logo Upload */}
           {/* <Box sx={{mb: 4, textAlign: 'center'}}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                style={{display: 'none'}}
              />
              <Box sx={{position: 'relative', display: 'inline-block'}}>
                <Avatar
                  src={formData.logoPreview}
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: 'primary.main',
                    fontSize: '3rem',
                    cursor: 'pointer',
                    mb: 2
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {!formData.logoPreview && <UilUsersAlt size="48"/>}
                </Avatar>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: -8,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {bgcolor: 'primary.dark'}
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UilCamera size="20"/>
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Click to upload group logo
              </Typography>
            </Box>*/}

            {/* Group Name */}
            <TextField
              fullWidth
              placeholder="Group Name"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              sx={{mb: 3}}
              required
            />

            {/* Description */}
            <TextField
              fullWidth
              placeholder="Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              multiline
              rows={4}
              sx={{mb: 3}}
            />

            {/* Tags */}
            <Box sx={{mb: 4}}>
              <Typography variant="subtitle1" sx={{fontWeight: 600, mb: 2}}>
                Tags
              </Typography>

              {/* Tag Display */}
              <Tags
                existingTags={formData.tags}
                availableTags={[]}
                handleTagAdd={handleTagAdd}
                handleTagRemove={handleTagRemove}
              />
            </Box>

            {/* Actions */}
            <Box sx={{display: 'flex', justifyContent: 'space-between', gap: 1}}>
              <Button
                variant="outlined"
                size={"small"}
                onClick={handleBack}
                sx={{p: 1, fontSize: "14px"}}
              >
                Cancel
              </Button>
              {selectedMembers.length === 0 ? (
                <Button
                  variant="contained"
                  onClick={handleOpenMembersDialog}
                  disabled={!formData.title.trim()}
                  startIcon={<UilUser size="18"/>}
                  size={"small"}
                  sx={{p: 1, fontSize: "14px"}}
                >
                  Select Members
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    onClick={handleCreateGroup}
                    startIcon={<UilUsersAlt size="18"/>}
                    size={"small"}
                    sx={{p: 1, fontSize: "14px"}}
                  >
                    Create Group
                  </Button>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <AddMembersDialog
        open={isAddMembersDialogOpen}
        onClose={handleCloseMembersDialog}
        onAddMembers={handleAddMembers}
      />
    </Box>
  );
};

export default CreateGroupPage;