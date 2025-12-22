import {useCallback, useState} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';
import {
  Close,
  PostAdd,
  LocalOffer,
  ShoppingCart,
} from '@mui/icons-material';
import {Tags} from "@/components/ui/Tags";

export interface PostCreateFormData {
  body: string;
  tags: string[];
  image?: File | null;
}

interface PostCreateFormProps {
  open: boolean;
  onClose: () => void;
  postType: 'post' | 'offer' | 'want';
  groupId?: string;
  onSubmit: (data: PostCreateFormData) => void;
  allTags?: string[];
}

const PostCreateForm = ({open, onClose, postType, onSubmit, allTags}: PostCreateFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<PostCreateFormData>({
    body: '',
    tags: [],
    image: null
  });
  // const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSubmit = () => {
    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    // Reset form data
    setFormData({
      body: '',
      tags: [],
      image: null
    });
    onClose();
  };

  // const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     // Check file size (e.g., max 5MB)
  //     if (file.size > 5 * 1024 * 1024) {
  //       alert('Image size should be less than 5MB');
  //       return;
  //     }
  //
  //     // Check file type
  //     if (!file.type.startsWith('image/')) {
  //       alert('Please upload an image file');
  //       return;
  //     }
  //
  //     setFormData(prev => ({ ...prev, image: file }));
  //
  //     // Create preview
  //     const reader = new FileReader();
  //     reader.onload = (e) => {
  //       setImagePreview(e.target?.result as string);
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };
  //
  // const handleRemoveImage = () => {
  //   setFormData(prev => ({ ...prev, image: null }));
  //   setImagePreview(null);
  // };

  const getTitle = () => {
    switch (postType) {
      case 'post':
        return 'Create Post';
      case 'offer':
        return 'Create Offer';
      case 'want':
        return 'Create Want';
      default:
        return 'Create Post';
    }
  };

  const getIcon = () => {
    switch (postType) {
      case 'post':
        return <PostAdd/>;
      case 'offer':
        return <LocalOffer/>;
      case 'want':
        return <ShoppingCart/>;
      default:
        return <PostAdd/>;
    }
  };

  const getIconColor = () => {
    switch (postType) {
      case 'post':
        return theme.palette.primary.main;
      case 'offer':
        return theme.palette.success.main;
      case 'want':
        return theme.palette.warning.main;
      default:
        return theme.palette.primary.main;
    }
  };

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

  const isFormValid = formData.body.trim();

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
      <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2}}>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
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
          <Close/>
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{p: 1, pt: 0, pb: 3}}>
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
          {/* Body Field */}
          <TextField
            sx={{mt: 1}}
            label="Body"
            fullWidth
            required
            multiline
            rows={6}
            value={formData.body}
            onChange={(e) => setFormData(prev => ({...prev, body: e.target.value}))}
            placeholder={`Describe your ${postType}...`}
          />

          {/* Tags Field */}
          <Box>
            <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
              Tags
            </Typography>
            <Tags
              allowNewTag={true}
              existingTags={formData.tags}
              availableTags={allTags}
              handleTagAdd={handleTagAdd}
              handleTagRemove={handleTagRemove}
            />
          </Box>

          {/* Image Upload */}
          {/*<Box>*/}
          {/*  <input*/}
          {/*    type="file"*/}
          {/*    accept="image/*"*/}
          {/*    onChange={handleImageUpload}*/}
          {/*    style={{ display: 'none' }}*/}
          {/*    id="image-upload-input"*/}
          {/*  />*/}
          {/*  <label htmlFor="image-upload-input">*/}
          {/*    <Button*/}
          {/*      variant="outlined"*/}
          {/*      component="span"*/}
          {/*      startIcon={<Image />}*/}
          {/*      fullWidth*/}
          {/*      sx={{ mb: 2 }}*/}
          {/*    >*/}
          {/*      Add Image*/}
          {/*    </Button>*/}
          {/*  </label>*/}
          {/*  */}
          {/*  {imagePreview && (*/}
          {/*    <Box sx={{ position: 'relative', mt: 2 }}>*/}
          {/*      <Box*/}
          {/*        component="img"*/}
          {/*        src={imagePreview}*/}
          {/*        alt="Upload preview"*/}
          {/*        sx={{*/}
          {/*          width: '100%',*/}
          {/*          maxHeight: 300,*/}
          {/*          objectFit: 'contain',*/}
          {/*          borderRadius: 2,*/}
          {/*          border: `1px solid ${theme.palette.divider}`*/}
          {/*        }}*/}
          {/*      />*/}
          {/*      <IconButton*/}
          {/*        onClick={handleRemoveImage}*/}
          {/*        sx={{*/}
          {/*          position: 'absolute',*/}
          {/*          top: 8,*/}
          {/*          right: 8,*/}
          {/*          backgroundColor: 'background.paper',*/}
          {/*          '&:hover': {*/}
          {/*            backgroundColor: 'background.default'*/}
          {/*          }*/}
          {/*        }}*/}
          {/*      >*/}
          {/*        <Delete />*/}
          {/*      </IconButton>*/}
          {/*    </Box>*/}
          {/*  )}*/}
          {/*</Box>*/}
        </Box>
      </DialogContent>

      <DialogActions sx={{p: 3, pt: 0}}>
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