import {forwardRef, useState, useEffect} from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
} from '@mui/material';
import {SocialGroup} from "@/.orm/shapes/group.typings.ts";
import {GroupAvatarUpload} from "@/components/groups/GroupAvatarUpload";
import {GroupTags} from "@/components/groups/GroupTags/GroupTags.tsx";

export interface EditableGroupStatsProps {
  group: SocialGroup;
  memberCount?: number;
}

export const EditableGroupStats = forwardRef<HTMLDivElement, EditableGroupStatsProps>(
  ({group}, ref) => {
    const [title, setTitle] = useState(group.title || '');
    const [description, setDescription] = useState(group.description || '');

    // Debounce title changes
    useEffect(() => {
      const handler = setTimeout(() => {
        if (title !== group.title) {
          group.title = title;
        }
      }, 500);

      return () => {
        clearTimeout(handler);
      };
    }, [title, group]);

    // Debounce description changes
    useEffect(() => {
      const handler = setTimeout(() => {
        if (description !== group.description) {
          group.description = description;
        }
      }, 500);

      return () => {
        clearTimeout(handler);
      };
    }, [description, group]);

    // Update local state when group prop changes
    useEffect(() => {
      setTitle(group.title || '');
      setDescription(group.description || '');
    }, [group.title, group.description]);

    /*const handleTagsChange = (tagString: string) => {
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
    };*/

    return (
      <Card ref={ref} sx={{mb: 3}}>
        <CardContent sx={{p: 3}}>
          <Typography variant="h6" sx={{fontWeight: 600, mb: 3}}>
            Group Information
          </Typography>

          <Box sx={{display: 'grid', gap: 3}}>
            {/* Group Image */}
            <Box sx={{display: 'flex', alignItems: 'center', gap: 3}}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                  Group Icon
                </Typography>
                <Box sx={{position: 'relative', display: 'inline-block'}}>
                  <GroupAvatarUpload size={{xs: 80, sm: 80}} initial={group.title} groupNuri={group["@graph"]} isEditing={true}/>
                </Box>
              </Box>
            </Box>
            {/* Group Name */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                Group Name
              </Typography>
              <TextField
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                variant="outlined"
                size="small"
              />
            </Box>

            {/* Description */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                Description
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                variant="outlined"
                size="small"
                placeholder="Add a description for your group"
              />
            </Box>

            {/* Tags */}
            <GroupTags group={group}/>

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