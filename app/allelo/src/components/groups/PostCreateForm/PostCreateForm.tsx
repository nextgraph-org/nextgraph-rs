import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip,
  InputAdornment,
  useTheme,
  alpha
} from '@mui/material';
import {
  Close,
  Info,
  Add,
  PostAdd,
  LocalOffer,
  ShoppingCart,
  Image,
  Delete
} from '@mui/icons-material';

export interface PostCreateFormData {
  title: string;
  body: string;
  tags: string[];
  indexViaMurmurations: boolean;
  runSocialQuery?: boolean;
  image?: File | null;
}

interface PostCreateFormProps {
  open: boolean;
  onClose: () => void;
  postType: 'post' | 'offer' | 'want';
  groupId?: string;
  onSubmit: (data: PostCreateFormData) => void;
}

const PostCreateForm = ({ open, onClose, postType, onSubmit }: PostCreateFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<PostCreateFormData>({
    title: '',
    body: '',
    tags: [],
    indexViaMurmurations: false,
    runSocialQuery: false,
    image: null
  });
  const [newTag, setNewTag] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSubmit = () => {
    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    // Reset form data
    setFormData({
      title: '',
      body: '',
      tags: [],
      indexViaMurmurations: false,
      runSocialQuery: false,
      image: null
    });
    setNewTag('');
    setImagePreview(null);
    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      setFormData(prev => ({ ...prev, image: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  const getTitle = () => {
    switch (postType) {
      case 'post': return 'Create Post';
      case 'offer': return 'Create Offer';
      case 'want': return 'Create Want';
      default: return 'Create Post';
    }
  };

  const getIcon = () => {
    switch (postType) {
      case 'post': return <PostAdd />;
      case 'offer': return <LocalOffer />;
      case 'want': return <ShoppingCart />;
      default: return <PostAdd />;
    }
  };

  const getIconColor = () => {
    switch (postType) {
      case 'post': return theme.palette.primary.main;
      case 'offer': return theme.palette.success.main;
      case 'want': return theme.palette.warning.main;
      default: return theme.palette.primary.main;
    }
  };

  const isFormValid = formData.title.trim() && formData.body.trim();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: alpha(getIconColor(), 0.1),
              color: getIconColor()
            }}
          >
            {getIcon()}
          </Box>
          <Typography variant="h6" component="div">
            {getTitle()}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Title Field */}
          <TextField
            label="Title"
            fullWidth
            required
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder={`Enter ${postType} title...`}
          />

          {/* Body Field */}
          <TextField
            label="Body"
            fullWidth
            required
            multiline
            rows={6}
            value={formData.body}
            onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
            placeholder={`Describe your ${postType}...`}
          />

          {/* Tags Field */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Tags
            </Typography>
            <TextField
              label="Add tags"
              fullWidth
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type and press Enter to add tags..."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleAddTag} disabled={!newTag.trim()}>
                      <Add />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            {formData.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Image Upload */}
          <Box>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="image-upload-input"
            />
            <label htmlFor="image-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<Image />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Add Image
              </Button>
            </label>
            
            {imagePreview && (
              <Box sx={{ position: 'relative', mt: 2 }}>
                <Box
                  component="img"
                  src={imagePreview}
                  alt="Upload preview"
                  sx={{
                    width: '100%',
                    maxHeight: 300,
                    objectFit: 'contain',
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`
                  }}
                />
                <IconButton
                  onClick={handleRemoveImage}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      backgroundColor: 'background.default'
                    }
                  }}
                >
                  <Delete />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Murmurations Toggle */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.indexViaMurmurations}
                  onChange={(e) => setFormData(prev => ({ ...prev, indexViaMurmurations: e.target.checked }))}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">Index via Murmurations</Typography>
                  <Tooltip
                    title="Your post will be indexed so that it can be found and published on other platforms and networks"
                    arrow
                  >
                    <Info sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </Tooltip>
                </Box>
              }
            />
          </Box>

          {/* Social Query Toggle (for Offers and Wants only) */}
          {(postType === 'offer' || postType === 'want') && (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.runSocialQuery || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, runSocialQuery: e.target.checked }))}
                  />
                }
                label={
                  <Typography variant="body2">Run a Social query</Typography>
                }
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isFormValid}
          sx={{
            backgroundColor: getIconColor(),
            '&:hover': {
              backgroundColor: alpha(getIconColor(), 0.8)
            }
          }}
        >
          Publish
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PostCreateForm;