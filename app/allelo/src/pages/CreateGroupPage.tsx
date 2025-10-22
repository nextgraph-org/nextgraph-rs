import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  PhotoCamera,
  Add,
  Close,
  Groups,
  Person,
} from '@mui/icons-material';

interface GroupFormData {
  name: string;
  description: string;
  logo: File | null;
  logoPreview: string;
  tags: string[];
}

const CreateGroupPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState('');
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    logo: null,
    logoPreview: '',
    tags: []
  });

  const handleBack = () => {
    navigate('/groups');
  };

  const handleNext = () => {
    // Validate form before proceeding
    if (!formData.name.trim()) {
      return; // TODO: Show validation error
    }
    // Navigate to contact selection
    const params = new URLSearchParams();
    params.set('mode', 'create-group');
    params.set('returnTo', 'create-group');
    params.set('groupData', encodeURIComponent(JSON.stringify(formData)));
    navigate(`/contacts?${params.toString()}`);
  };

  const handleInputChange = (field: keyof GroupFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: { xs: '100vw', md: '800px' },
      mx: 'auto',
      pt: { xs: 1.5, md: 2 },
      pb: 0,
    }}>
      {/* Header */}
      <Box sx={{ 
        mb: { xs: 2, md: 3 },
        px: { xs: '10px', md: 0 }
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, md: 2 }, 
          mb: { xs: 2, md: 3 }
        }}>
          <IconButton onClick={handleBack} size="large" sx={{ flexShrink: 0 }}>
            <ArrowBack />
          </IconButton>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.5rem', md: '2.125rem' }
            }}
          >
            Create New Group
          </Typography>
        </Box>

      </Box>

      {/* Form Content */}
      <Box sx={{ px: { xs: '10px', md: 0 } }}>
        <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Group Information
              </Typography>

              {/* Logo Upload */}
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
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
                    {!formData.logoPreview && <Groups />}
                  </Avatar>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: -8,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PhotoCamera />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Click to upload group logo
                </Typography>
              </Box>

              {/* Group Name */}
              <TextField
                fullWidth
                label="Group Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                sx={{ mb: 3 }}
                required
              />

              {/* Description */}
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={4}
                sx={{ mb: 3 }}
                placeholder="What is this group about?"
              />

              {/* Tags */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Tags
                </Typography>
                
                {/* Tag Input */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    startIcon={<Add />}
                  >
                    Add
                  </Button>
                </Box>

                {/* Tag Display */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      deleteIcon={<Close />}
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={handleBack}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!formData.name.trim()}
                  startIcon={<Person />}
                >
                  Select Members
                </Button>
              </Box>
            </CardContent>
          </Card>
      </Box>
    </Box>
  );
};

export default CreateGroupPage;