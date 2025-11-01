import { useState } from 'react';
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

interface PostCreateButtonProps {
  groupId?: string;
  onCreatePost?: (type: 'post' | 'offer' | 'want', groupId?: string) => void;
}

const PostCreateButton = ({ groupId, onCreatePost }: PostCreateButtonProps) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleCreatePost = (type: 'post' | 'offer' | 'want') => {
    if (onCreatePost) {
      onCreatePost(type, groupId);
    } else {
      // Default behavior - navigate to posts page with type parameter
      const searchParams = new URLSearchParams();
      searchParams.append('type', type);
      if (groupId) {
        searchParams.append('groupId', groupId);
      }
      window.location.href = `/posts?${searchParams.toString()}`;
    }
    handleClose();
  };

  const postTypes = [
    {
      type: 'post' as const,
      title: 'Post',
      description: 'Share an update, thought, or announcement',
      icon: <UilFileEditAlt size="20" />,
      color: theme.palette.primary.main
    },
    {
      type: 'offer' as const,
      title: 'Offer',
      description: 'Offer your services, expertise, or resources',
      icon: <UilTag size="20" />,
      color: theme.palette.success.main
    },
    {
      type: 'want' as const,
      title: 'Want',
      description: 'Request help, services, or connections',
      icon: <UilShoppingCart size="20" />,
      color: theme.palette.warning.main
    }
  ];

  return (
    <>
      <Fab
        color="primary"
        aria-label="create post"
        onClick={handleOpen}
      >
        <UilPlus size="20" />
      </Fab>

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" component="div">
            What would you like to create?
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <UilTimes size="20" />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 2, pt: 0 }}>
          <List sx={{ p: 0 }}>
            {postTypes.map((postType, index) => (
              <ListItem key={postType.type} disablePadding sx={{ mb: index < postTypes.length - 1 ? 1 : 0 }}>
                <ListItemButton
                  onClick={() => handleCreatePost(postType.type)}
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
                  <ListItemIcon sx={{ minWidth: 48 }}>
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
    </>
  );
};

export default PostCreateButton;