import {useState} from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';
import {
  UilPlus,
  UilFileEditAlt,
  UilTag,
  UilShoppingCart,
  UilTimes
} from '@iconscout/react-unicons';
import PostCreateForm, {PostCreateFormData} from "@/components/posts/PostCreateForm";

interface PostCreateButtonProps {
  onCreatePost?: (type: 'post' | 'offer' | 'want', data: PostCreateFormData) => void;
  allTags?: string[];
}

const PostCreateButton = ({onCreatePost, allTags}: PostCreateButtonProps) => {
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedType, setSelectedType] = useState<'post' | 'offer' | 'want'>('post');
  const theme = useTheme();

  const showPostType = () => {
    setShowTypeDialog(true);
  };

  const hidePostType = () => {
    setShowTypeDialog(false);
  };

  const handleSelectPostType = (type: 'post' | 'offer' | 'want') => {
    setSelectedType(type);
    setShowTypeDialog(false);
    setShowCreateForm(true);
  };

  const handleFormSubmit = (data: PostCreateFormData) => {
    if (onCreatePost) {
      onCreatePost(selectedType, data);
    }
    setShowCreateForm(false);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
  };

  const postTypes = [
    {
      type: 'post' as const,
      title: 'Post',
      description: 'Share an update, thought, or announcement',
      icon: <UilFileEditAlt size="20"/>,
      color: theme.palette.primary.main,
    },
    {
      type: 'offer' as const,
      title: 'Offer',
      description: 'Offer your services, expertise, or resources',
      icon: <UilTag size="20"/>,
      color: theme.palette.success.main,
      disabled: true
    },
    {
      type: 'want' as const,
      title: 'Want',
      description: 'Request help, services, or connections',
      icon: <UilShoppingCart size="20"/>,
      color: theme.palette.warning.main,
      disabled: true
    }
  ];

  return (
    <>
      <Fab
        color="primary"
        aria-label="create post"
        onClick={showPostType}
      >
        <UilPlus size="20"/>
      </Fab>

      <Dialog
        open={showTypeDialog}
        onClose={hidePostType}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1}}>
          <Typography variant="h6" component="div">
            What would you like to create?
          </Typography>
          <IconButton onClick={hidePostType} size="small">
            <UilTimes size="20"/>
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{p: 2, pt: 0}}>
          <List sx={{p: 0}}>
            {postTypes.map((postType, index) => (
              <ListItem key={postType.type} disablePadding sx={{mb: index < postTypes.length - 1 ? 1 : 0}}>
                <ListItemButton
                  disabled={postType.disabled ?? false}
                  onClick={() => handleSelectPostType(postType.type)}
                  sx={{
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    p: 2,
                    '&:hover': {
                      borderColor: postType.color,
                      backgroundColor: alpha(postType.color, 0.04),
                    }
                  }}
                >
                  <ListItemIcon sx={{minWidth: 48}}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        backgroundColor: alpha(postType.color, 0.1),
                        color: postType.color
                      }}
                    >
                      {postType.icon}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={postType.title}
                    secondary={postType.description}
                    primaryTypographyProps={{
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.875rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Create Form */}
      <PostCreateForm
        open={showCreateForm}
        onClose={handleFormClose}
        postType={selectedType}
        onSubmit={handleFormSubmit}
        allTags={allTags}
      />
    </>
  );
};

export default PostCreateButton;