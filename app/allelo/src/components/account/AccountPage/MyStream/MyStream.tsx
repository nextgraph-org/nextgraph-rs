import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Stream,
  Add,
  Close,
  PostAdd,
  LocalOffer,
  ShoppingCart,
} from '@mui/icons-material';
import PostCreateForm, {PostCreateFormData} from "@/components/posts/PostCreateForm";

export const MyStream = () => {
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedType, setSelectedType] = useState<'post' | 'offer' | 'want'>('post');
  const theme = useTheme();

  const handleCreatePost = () => {
    setShowTypeDialog(true);
  };

  const handleSelectPostType = (type: 'post' | 'offer' | 'want') => {
    setSelectedType(type);
    setShowTypeDialog(false);
    setShowCreateForm(true);
  };

  const handleFormSubmit = (data: PostCreateFormData) => {
    console.log(`Creating ${selectedType} from My Stream:`, data);
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
      icon: <PostAdd />,
      color: theme.palette.primary.main
    },
    {
      type: 'offer' as const,
      title: 'Offer',
      description: 'Offer your services, expertise, or resources',
      icon: <LocalOffer />,
      color: theme.palette.success.main
    },
    {
      type: 'want' as const,
      title: 'Want',
      description: 'Request help, services, or connections',
      icon: <ShoppingCart />,
      color: theme.palette.warning.main
    }
  ];

  return (
    <Box sx={{ mt: 2 }}>
      <Card sx={{ 
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header with title and add button */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Stream sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                My Stream
              </Typography>
            </Box>
            <IconButton
              onClick={handleCreatePost}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                },
              }}
            >
              <Add />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Latest posts from your network
            </Typography>
            
            <Card 
              variant="outlined" 
              sx={{ 
                p: 2,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => console.log('Navigate to post by Mike Chen')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ width: 32, height: 32 }}>M</Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Mike Chen</Typography>
                  <Typography variant="caption" color="text.secondary">2 hours ago</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Just shipped a new feature for our React dashboard! The drag-and-drop interface is finally working perfectly. 🚀
              </Typography>
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80"
                alt="React dashboard screenshot"
                sx={{
                  width: '100%',
                  maxWidth: 400,
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider'
                }}
              />
            </Card>

            <Card 
              variant="outlined" 
              sx={{ 
                p: 2,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => console.log('Navigate to post by Lisa Rodriguez')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ width: 32, height: 32 }}>L</Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Lisa Rodriguez</Typography>
                  <Typography variant="caption" color="text.secondary">5 hours ago</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Looking for feedback on my latest design system. Any UX experts in my network want to take a look?
              </Typography>
            </Card>

            <Card 
              variant="outlined" 
              sx={{ 
                p: 2,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => console.log('Navigate to post by Alex Thompson')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Alex Thompson</Typography>
                  <Typography variant="caption" color="text.secondary">1 day ago</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Excited to announce our startup just secured Series A funding! Thanks to everyone who supported us. 🎉
              </Typography>
            </Card>

            <Card 
              variant="outlined" 
              sx={{ 
                p: 2,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => console.log('Navigate to post by Sarah Kim')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ width: 32, height: 32 }}>S</Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Sarah Kim</Typography>
                  <Typography variant="caption" color="text.secondary">2 days ago</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Working on a new sustainability project. Would love to connect with others interested in green tech innovations.
              </Typography>
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                alt="Green technology and sustainability concept"
                sx={{
                  width: '100%',
                  maxWidth: 400,
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider'
                }}
              />
            </Card>

            <Card 
              variant="outlined" 
              sx={{ 
                p: 2,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => console.log('Navigate to post by David Wilson')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ width: 32, height: 32 }}>D</Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>David Wilson</Typography>
                  <Typography variant="caption" color="text.secondary">3 days ago</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Attending the tech conference next week. Looking forward to the AI and machine learning sessions!
              </Typography>
            </Card>

            <Card 
              variant="outlined" 
              sx={{ 
                p: 2,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => console.log('Navigate to post by Emma Davis')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ width: 32, height: 32 }}>E</Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Emma Davis</Typography>
                  <Typography variant="caption" color="text.secondary">4 days ago</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Just published a new article on React performance optimization. Link in the comments below.
              </Typography>
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                alt="Code editor with React performance optimization"
                sx={{
                  width: '100%',
                  maxWidth: 400,
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider'
                }}
              />
            </Card>
          </Box>
          {/* Note: Removed "View All Posts" button as requested - this should show all posts */}
        </CardContent>
      </Card>

      {/* Post Type Selection Dialog */}
      <Dialog 
        open={showTypeDialog} 
        onClose={() => setShowTypeDialog(false)}
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
          <IconButton onClick={() => setShowTypeDialog(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 2, pt: 0 }}>
          <List sx={{ p: 0 }}>
            {postTypes.map((postType, index) => (
              <ListItem key={postType.type} disablePadding sx={{ mb: index < postTypes.length - 1 ? 1 : 0 }}>
                <Box
                  component="div"
                  onClick={() => handleSelectPostType(postType.type)}
                  sx={{
                    width: '100%',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    p: 2,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
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
                </Box>
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
      />
    </Box>
  );
};