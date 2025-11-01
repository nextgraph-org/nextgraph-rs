import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
  Grid,
  IconButton,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  UilBriefcase as Business,
  UilUser as PersonOutline,
  UilUsersAlt as Groups,
  UilEstate as FamilyRestroom,
  UilHeart as Favorite,
  UilHome as Home,
  UilBriefcaseAlt as Work,
  UilGraduationCap as School,
  UilHospital as LocalHospital,
  UilFootball as Sports,
  UilTimes as Close,
  UilEdit as Edit,
  UilTrashAlt as Delete,
} from '@iconscout/react-unicons';
import type { RCardWithPrivacy } from '@/types/notification';
import { DEFAULT_PRIVACY_SETTINGS } from '@/types/notification';

interface RCardManagementProps {
  open: boolean;
  onClose: () => void;
  onSave: (rCard: RCardWithPrivacy) => void;
  onDelete?: (rCardId: string) => void;
  editingRCard?: RCardWithPrivacy;
  isGroupJoinContext?: boolean;
}

const AVAILABLE_ICONS = [
  { name: 'Business', icon: <Business />, label: 'Business' },
  { name: 'PersonOutline', icon: <PersonOutline />, label: 'Person' },
  { name: 'Groups', icon: <Groups />, label: 'Groups' },
  { name: 'FamilyRestroom', icon: <FamilyRestroom />, label: 'Family' },
  { name: 'Favorite', icon: <Favorite />, label: 'Heart' },
  { name: 'Home', icon: <Home />, label: 'Home' },
  { name: 'Work', icon: <Work />, label: 'Work' },
  { name: 'School', icon: <School />, label: 'School' },
  { name: 'LocalHospital', icon: <LocalHospital />, label: 'Medical' },
  { name: 'Sports', icon: <Sports />, label: 'Sports' },
];

const AVAILABLE_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange-red
  '#6366f1', // Indigo
];

const RCardManagement = ({ 
  open, 
  onClose, 
  onSave, 
  onDelete, 
  editingRCard,
  isGroupJoinContext = false
}: RCardManagementProps) => {
  const [formData, setFormData] = useState({
    name: editingRCard?.name || '',
    description: editingRCard?.description || '',
    color: editingRCard?.color || AVAILABLE_COLORS[0],
    icon: editingRCard?.icon || 'PersonOutline',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form data when editingRCard changes
  useEffect(() => {
    if (editingRCard) {
      setFormData({
        name: editingRCard.name,
        description: editingRCard.description || '',
        color: editingRCard.color || AVAILABLE_COLORS[0],
        icon: editingRCard.icon || 'PersonOutline',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: AVAILABLE_COLORS[0],
        icon: 'PersonOutline',
      });
    }
    setErrors({});
  }, [editingRCard]);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const rCardData: RCardWithPrivacy = {
      id: editingRCard?.id || `custom-${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      color: formData.color,
      icon: formData.icon,
      isDefault: editingRCard?.isDefault || false,
      createdAt: editingRCard?.createdAt || new Date(),
      updatedAt: new Date(),
      privacySettings: editingRCard?.privacySettings || { ...DEFAULT_PRIVACY_SETTINGS },
    };

    onSave(rCardData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      color: AVAILABLE_COLORS[0],
      icon: 'PersonOutline',
    });
    setErrors({});
    onClose();
  };

  const handleDelete = () => {
    if (editingRCard && onDelete) {
      onDelete(editingRCard.id);
      handleClose();
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconData = AVAILABLE_ICONS.find(icon => icon.name === iconName);
    return iconData?.icon || <PersonOutline />;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {editingRCard ? 'Edit Profile Card' : 'Create New Profile Card'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* Preview */}
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Preview
              </Typography>
              <Avatar
                sx={{ 
                  bgcolor: formData.color, 
                  width: 64, 
                  height: 64, 
                  mx: 'auto', 
                  mb: 2 
                }}
              >
                {getIconComponent(formData.icon)}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {formData.name || 'Profile Card Name'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formData.description || 'Profile Card description'}
              </Typography>
              {editingRCard?.isDefault && (
                <Chip label="Default" size="small" variant="outlined" sx={{ mt: 1 }} />
              )}
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Profile Card Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={!!errors.name}
                helperText={errors.name}
                placeholder="e.g., Close Friends, Work Colleagues, Gym Buddies"
              />
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                error={!!errors.description}
                helperText={errors.description}
                placeholder="Describe the type of relationship and what you'll share with this group"
              />
            </Grid>

            {/* Icon Selection */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Choose an Icon
              </Typography>
              <Grid container spacing={1}>
                {AVAILABLE_ICONS.map((iconData) => (
                  <Grid size="auto" key={iconData.name}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        border: formData.icon === iconData.name ? 2 : 1,
                        borderColor: formData.icon === iconData.name ? 'primary.main' : 'divider',
                        '&:hover': { borderColor: 'primary.main' },
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, icon: iconData.name }))}
                    >
                      <CardContent sx={{ p: 2, textAlign: 'center', minWidth: 80 }}>
                        <Box sx={{ color: formData.color, mb: 1 }}>
                          {iconData.icon}
                        </Box>
                        <Typography variant="caption">
                          {iconData.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Color Selection */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Choose a Color
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {AVAILABLE_COLORS.map((color) => (
                  <Box
                    key={color}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      border: formData.color === color ? 3 : 2,
                      borderColor: formData.color === color ? 'grey.800' : 'grey.300',
                      '&:hover': { borderColor: 'grey.600' },
                    }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>

          {/* Default rCard Warning */}
          {editingRCard?.isDefault && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1, border: 1, borderColor: 'warning.200' }}>
              <Typography variant="body2" color="warning.dark">
                <strong>Note:</strong> This is a default profile card. You can edit its name, description, and settings to create a new profile card.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
          <Box>
            {editingRCard && !editingRCard.isDefault && onDelete && (
              <Button
                color="error"
                startIcon={<Delete />}
                onClick={handleDelete}
              >
                Delete Profile Card
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              startIcon={editingRCard ? <Edit /> : undefined}
            >
              {isGroupJoinContext 
                ? 'Save and use this profile' 
                : (editingRCard ? 'Save Changes' : 'Create Profile Card')
              }
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default RCardManagement;