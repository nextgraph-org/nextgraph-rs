import { forwardRef, useRef } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Chip,
  Avatar,
  IconButton,
  Button,
} from '@mui/material';
import {
  UilCamera as PhotoCamera,
  UilTrashAlt as Delete,
} from '@iconscout/react-unicons';
import type { Group } from '@/types/group';

export interface EditableGroupStatsProps {
  group: Group;
  memberCount?: number;
  onChange: (field: keyof Group, value: unknown) => void;
}

export const EditableGroupStats = forwardRef<HTMLDivElement, EditableGroupStatsProps>(
  ({ group, onChange }, ref) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTagsChange = (tagString: string) => {
      const tags = tagString.split(',').map(tag => tag.trim()).filter(tag => tag);
      onChange('tags', tags);
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // In a real app, this would upload to a server
        // For now, we'll create a local URL
        const imageUrl = URL.createObjectURL(file);
        onChange('image', imageUrl);
      }
    };

    const handleRemoveImage = () => {
      onChange('image', '');
    };

    const triggerFileInput = () => {
      fileInputRef.current?.click();
    };

    return (
      <Card ref={ref} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Group Information
          </Typography>
          
          <Box sx={{ display: 'grid', gap: 3 }}>
            {/* Group Image */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Group Icon
                </Typography>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar
                    src={group.image}
                    alt={group.name}
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'white',
                      border: 2,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      fontSize: '2rem',
                      fontWeight: 600,
                    }}
                  >
                    {!group.image && group.name.charAt(0)}
                  </Avatar>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: -8,
                      right: -8,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      width: 32,
                      height: 32,
                    }}
                    onClick={triggerFileInput}
                  >
                    <PhotoCamera sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>
              {group.image && (
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleRemoveImage}
                    startIcon={<Delete />}
                  >
                    Remove Icon
                  </Button>
                </Box>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </Box>
            {/* Group Name */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Group Name
              </Typography>
              <TextField
                fullWidth
                value={group.name || ''}
                onChange={(e) => onChange('name', e.target.value)}
                variant="outlined"
                size="small"
              />
            </Box>

            {/* Description */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Description
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={group.description || ''}
                onChange={(e) => onChange('description', e.target.value)}
                variant="outlined"
                size="small"
                placeholder="Add a description for your group"
              />
            </Box>

            {/* Tags */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Tags (comma-separated)
              </Typography>
              <TextField
                fullWidth
                value={group.tags?.join(', ') || ''}
                onChange={(e) => handleTagsChange(e.target.value)}
                variant="outlined"
                size="small"
                placeholder="e.g., community, tech, education"
              />
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {group.tags?.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    sx={{ 
                      backgroundColor: 'primary.light',
                      color: 'primary.main',
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Created Date */}
            <Box>
              <Typography variant="body2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body1">
                {group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }
);

EditableGroupStats.displayName = 'EditableGroupStats';