import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  Search,
  MoreVert,
  Edit,
  Delete,
  Add,
} from '@mui/icons-material';

interface SocialQuery {
  id: string;
  title: string;
  type: 'offer' | 'want';
  description: string;
  tags: string[];
  createdAt: Date;
  lastModified: Date;
}

const mockSocialQueries: SocialQuery[] = [
  {
    id: '1',
    title: 'React Development Services',
    type: 'offer',
    description: 'Offering professional React development services for web applications. Experienced with TypeScript, Material-UI, and modern React patterns.',
    tags: ['React', 'TypeScript', 'Frontend', 'Web Development'],
    createdAt: new Date('2025-08-10'),
    lastModified: new Date('2025-08-15'),
  },
  {
    id: '2',
    title: 'UX Design Consultation',
    type: 'want',
    description: 'Looking for an experienced UX designer to review my product design and provide feedback on user experience improvements.',
    tags: ['UX Design', 'Product Design', 'Consultation'],
    createdAt: new Date('2025-08-12'),
    lastModified: new Date('2025-08-12'),
  },
  {
    id: '3',
    title: 'Technical Writing Help',
    type: 'offer',
    description: 'Available to help with technical documentation, API documentation, and developer guides. Strong background in software engineering.',
    tags: ['Technical Writing', 'Documentation', 'API'],
    createdAt: new Date('2025-08-08'),
    lastModified: new Date('2025-08-14'),
  },
  {
    id: '4',
    title: 'Machine Learning Mentorship',
    type: 'want',
    description: 'Seeking a mentor to guide me through advanced machine learning concepts and help with career transition into AI/ML field.',
    tags: ['Machine Learning', 'Mentorship', 'Career Development', 'AI'],
    createdAt: new Date('2025-08-05'),
    lastModified: new Date('2025-08-11'),
  },
];

export const SocialQueries = () => {
  const [queries, setQueries] = useState<SocialQuery[]>(mockSocialQueries);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedQuery, setSelectedQuery] = useState<SocialQuery | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingQuery, setEditingQuery] = useState<SocialQuery | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'offer' as 'offer' | 'want',
    description: '',
    tags: '',
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, query: SocialQuery) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedQuery(query);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedQuery(null);
  };

  const handleEdit = () => {
    if (selectedQuery) {
      setEditingQuery(selectedQuery);
      setFormData({
        title: selectedQuery.title,
        type: selectedQuery.type,
        description: selectedQuery.description,
        tags: selectedQuery.tags.join(', '),
      });
      setShowEditDialog(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedQuery) {
      setQueries(prev => prev.filter(q => q.id !== selectedQuery.id));
      console.log('Deleted query:', selectedQuery.title);
    }
    handleMenuClose();
  };

  const handleCreateNew = () => {
    setFormData({
      title: '',
      type: 'offer',
      description: '',
      tags: '',
    });
    setShowCreateDialog(true);
  };

  const handleFormSubmit = () => {
    if (formData.title.trim() && formData.description.trim()) {
      const newQuery: SocialQuery = {
        id: `new-${Date.now()}`,
        title: formData.title.trim(),
        type: formData.type,
        description: formData.description.trim(),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        createdAt: new Date(),
        lastModified: new Date(),
      };

      if (editingQuery) {
        setQueries(prev => prev.map(q => 
          q.id === editingQuery.id 
            ? { ...newQuery, id: editingQuery.id, createdAt: editingQuery.createdAt }
            : q
        ));
        setShowEditDialog(false);
        setEditingQuery(null);
      } else {
        setQueries(prev => [newQuery, ...prev]);
        setShowCreateDialog(false);
      }

      setFormData({ title: '', type: 'offer', description: '', tags: '' });
    }
  };

  const handleFormCancel = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setEditingQuery(null);
    setFormData({ title: '', type: 'offer', description: '', tags: '' });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Card sx={{ 
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Search sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Social Queries
              </Typography>
            </Box>
            <IconButton
              onClick={handleCreateNew}
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
          
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 2, color: 'text.secondary' }}>
            Offers and wants with social query enabled
          </Typography>

          <List sx={{ p: 0 }}>
            {queries.map((query, index) => (
              <Box key={query.id}>
                <ListItem
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    p: 2,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={query.type === 'offer' ? 'OFFER' : 'WANT'}
                          size="small"
                          color={query.type === 'offer' ? 'success' : 'warning'}
                          variant="filled"
                        />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {query.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {query.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {query.tags.map((tag, tagIndex) => (
                          <Chip
                            key={tagIndex}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Created {query.createdAt.toLocaleDateString()} • 
                        Last modified {query.lastModified.toLocaleDateString()}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, query)}
                      sx={{ ml: 1 }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                </ListItem>
                {index < queries.length - 1 && <Divider />}
              </Box>
            ))}
          </List>

          {queries.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No social queries yet. Click the + button to create your first one.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || showEditDialog}
        onClose={handleFormCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle>
          {editingQuery ? 'Edit Social Query' : 'Create New Social Query'}
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a descriptive title..."
            />

            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', fontWeight: 600 }}>
                Type
              </FormLabel>
              <RadioGroup
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'offer' | 'want' }))}
                row
              >
                <FormControlLabel
                  value="offer"
                  control={<Radio size="small" />}
                  label="Offer (I can provide)"
                />
                <FormControlLabel
                  value="want"
                  control={<Radio size="small" />}
                  label="Want (I need)"
                />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what you're offering or looking for..."
            />

            <TextField
              fullWidth
              label="Tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="Enter tags separated by commas (e.g., React, TypeScript, Frontend)"
              helperText="Use tags to help others discover your query"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleFormCancel} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleFormSubmit}
            variant="contained"
            disabled={!formData.title.trim() || !formData.description.trim()}
          >
            {editingQuery ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};