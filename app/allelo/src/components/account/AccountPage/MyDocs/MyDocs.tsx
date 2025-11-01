import { useState, forwardRef } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Paper,
  Divider,
  Collapse,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Description,
  ExpandLess,
  ExpandMore,
  Folder,
  Add,
  MoreHoriz,
  Edit,
  Delete,
  FileCopy,
  Share,
} from '@mui/icons-material';

interface SharedWith {
  contact: Contact;
  permission: 'read' | 'write';
  sharedAt: Date;
}

interface Document {
  id: string;
  title: string;
  content: string;
  lastModified: Date;
  children?: Document[];
  sharedWith?: SharedWith[];
}

interface Contact {
  id: string;
  name: string;
  type: 'person' | 'group';
  email?: string;
}

interface ShareData {
  permission: 'read' | 'write';
  shareWith: Contact[];
}

const mockPersonalDocuments: Document[] = [
  {
    id: '1',
    title: 'My Journal',
    content: `# My Personal Journal

## Recent Thoughts

### August 2025
Today I've been reflecting on my journey in the NAO network. The connections I've made have been invaluable for both personal and professional growth.

### Goals for the Month
- Complete the React dashboard project
- Attend at least 2 networking events
- Contribute to 3 open source projects
- Write weekly journal entries

### Lessons Learned
- Building authentic relationships takes time but is worth the investment
- Sharing knowledge openly creates unexpected opportunities
- Small daily actions compound into significant progress`,
    lastModified: new Date('2025-08-15'),
    sharedWith: [
      {
        contact: { id: '1', name: 'Alice Johnson', type: 'person', email: 'alice@example.com' },
        permission: 'read',
        sharedAt: new Date('2025-08-12')
      },
      {
        contact: { id: '6', name: 'React Developers Group', type: 'group' },
        permission: 'write',
        sharedAt: new Date('2025-08-14')
      }
    ]
  },
  {
    id: '2',
    title: 'Project Ideas',
    content: `# Project Ideas Collection

## Active Projects
### 1. Personal Dashboard
- **Status**: In Development
- **Tech Stack**: React, TypeScript, Material-UI
- **Goal**: Create a comprehensive personal productivity tool

### 2. Network Mapping Tool
- **Status**: Planning Phase
- **Description**: Visualize connections and relationships in professional networks
- **Potential Impact**: Help others understand their network dynamics

## Future Projects
- AI-powered content summarization tool
- Community event planning platform
- Skills matching service for collaboration
- Sustainability tracking application

## Research Areas
- Graph databases for social networks
- Natural language processing applications
- Collaborative filtering algorithms`,
    lastModified: new Date('2025-08-12'),
    sharedWith: [
      {
        contact: { id: '2', name: 'Bob Smith', type: 'person', email: 'bob@example.com' },
        permission: 'read',
        sharedAt: new Date('2025-08-10')
      }
    ]
  },
  {
    id: '3',
    title: 'Learning Resources',
    content: `# My Learning Resources

## Currently Reading
- **"Building Microservices"** by Sam Newman
- **"Designing Data-Intensive Applications"** by Martin Kleppmann
- Various articles on React performance optimization

## Online Courses
### Completed
- ✓ Advanced React Patterns (2025)
- ✓ System Design Interview Prep (2025)
- ✓ TypeScript Deep Dive (2024)

### In Progress
- GraphQL with React and Node.js
- Docker and Kubernetes Fundamentals

### Planned
- Machine Learning for Developers
- Advanced Database Design

## Bookmarks & Articles
- React Server Components explained
- Modern CSS layout techniques
- API design best practices
- Performance monitoring strategies`,
    lastModified: new Date('2025-08-10'),
    children: [
      {
        id: '3.1',
        title: 'React Notes',
        content: `# React Development Notes

## Performance Optimization
- Use React.memo for expensive components
- Implement proper key props for lists
- Leverage useCallback and useMemo strategically
- Consider React.lazy for code splitting

## State Management
- Local state for component-specific data
- Context for app-wide themes and user data
- Redux/Zustand for complex state logic
- React Query for server state

## Testing Strategies
- Unit tests with Jest and React Testing Library
- Integration tests for user workflows
- E2E tests with Playwright
- Visual regression testing with Chromatic`,
        lastModified: new Date('2025-08-08'),
      },
    ],
  },
  {
    id: '4',
    title: 'Career Planning',
    content: `# Career Development Plan

## Short-term Goals (6 months)
- [ ] Complete React certification
- [ ] Build and deploy 2 significant personal projects
- [ ] Speak at a local tech meetup
- [ ] Expand professional network by 50 connections

## Medium-term Goals (1-2 years)
- [ ] Transition to senior developer role
- [ ] Contribute to major open source project
- [ ] Launch a successful side project
- [ ] Mentor junior developers

## Long-term Vision (3-5 years)
- [ ] Technical leadership position
- [ ] Build a product that impacts 10k+ users
- [ ] Establish thought leadership in React ecosystem
- [ ] Create educational content and courses

## Skills to Develop
### Technical
- Advanced system design
- Cloud architecture (AWS/Azure)
- DevOps and CI/CD pipelines
- Performance optimization

### Soft Skills
- Public speaking and presentation
- Technical writing and documentation
- Team leadership and mentoring
- Product thinking and user empathy`,
    lastModified: new Date('2025-08-05'),
  },
];

// Mock contacts and groups for autocomplete
const mockContacts: Contact[] = [
  { id: '1', name: 'Alice Johnson', type: 'person', email: 'alice@example.com' },
  { id: '2', name: 'Bob Smith', type: 'person', email: 'bob@example.com' },
  { id: '3', name: 'Carol Williams', type: 'person', email: 'carol@example.com' },
  { id: '4', name: 'David Brown', type: 'person', email: 'david@example.com' },
  { id: '5', name: 'Emma Davis', type: 'person', email: 'emma@example.com' },
  { id: '6', name: 'React Developers Group', type: 'group' },
  { id: '7', name: 'Design Team', type: 'group' },
  { id: '8', name: 'Product Management', type: 'group' },
  { id: '9', name: 'Engineering Team', type: 'group' },
  { id: '10', name: 'UX Research Group', type: 'group' },
];

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MyDocsProps {}

export const MyDocs = forwardRef<HTMLDivElement, MyDocsProps>(
  (_, ref) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [documents, setDocuments] = useState<Document[]>(mockPersonalDocuments);
    const [selectedDoc, setSelectedDoc] = useState<Document>(mockPersonalDocuments[0]);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['3']));
    const [hoveredDoc, setHoveredDoc] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [menuDoc, setMenuDoc] = useState<Document | null>(null);
    const [showNewDocInput, setShowNewDocInput] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareData, setShareData] = useState<ShareData>({
      permission: 'read',
      shareWith: []
    });
    const [shareDocument, setShareDocument] = useState<Document | null>(null);

    const handleToggleExpand = (docId: string) => {
      setExpandedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(docId)) {
          newSet.delete(docId);
        } else {
          newSet.add(docId);
        }
        return newSet;
      });
    };

    const handleAddNewChildDoc = (parentDoc: Document) => {
      console.log('Adding new document under:', parentDoc.title);
      // In a real app, this would open a dialog or create a new document
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, doc: Document) => {
      event.stopPropagation();
      setMenuAnchor(event.currentTarget);
      setMenuDoc(doc);
    };

    const handleMenuClose = () => {
      setMenuAnchor(null);
      setMenuDoc(null);
    };

    const handleMenuAction = (action: string) => {
      if (action === 'share' && menuDoc) {
        setShareDocument(menuDoc);
        setShowShareDialog(true);
        setShareData({ permission: 'read', shareWith: [] });
      } else {
        console.log(`${action} document:`, menuDoc?.title);
      }
      handleMenuClose();
    };

    const handleAddNewDoc = () => {
      setShowNewDocInput(true);
      setNewDocTitle('');
    };

    const handleCreateNewDoc = () => {
      if (newDocTitle.trim()) {
        const newDoc: Document = {
          id: `new-${Date.now()}`,
          title: newDocTitle.trim(),
          content: `# ${newDocTitle.trim()}\n\nStart writing your document here...`,
          lastModified: new Date(),
        };
        
        setDocuments(prev => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
        setShowNewDocInput(false);
        setNewDocTitle('');
      }
    };

    const handleCancelNewDoc = () => {
      setShowNewDocInput(false);
      setNewDocTitle('');
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleCreateNewDoc();
      } else if (event.key === 'Escape') {
        handleCancelNewDoc();
      }
    };

    const handleStartEditing = () => {
      setIsEditing(true);
      setEditContent(selectedDoc?.content || '');
    };

    const handleSaveEdit = () => {
      if (selectedDoc) {
        const updatedDoc = {
          ...selectedDoc,
          content: editContent,
          lastModified: new Date(),
        };
        
        setDocuments(prev => prev.map(doc => 
          doc.id === selectedDoc.id ? updatedDoc : doc
        ));
        setSelectedDoc(updatedDoc);
      }
      setIsEditing(false);
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditContent('');
    };

    const handleEditKeyPress = (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancelEdit();
      }
      // Note: Ctrl+Enter or Cmd+Enter could be used to save, but for simplicity 
      // we'll use a save button or click outside to save
    };

    const handleShareDialogClose = () => {
      setShowShareDialog(false);
      setShareDocument(null);
      setShareData({ permission: 'read', shareWith: [] });
    };

    const handleShareSubmit = () => {
      if (shareDocument && shareData.shareWith.length > 0) {
        // Add new shares to the document
        const newShares: SharedWith[] = shareData.shareWith.map(contact => ({
          contact,
          permission: shareData.permission,
          sharedAt: new Date()
        }));

        const updatedDoc = {
          ...shareDocument,
          sharedWith: [...(shareDocument.sharedWith || []), ...newShares]
        };

        setDocuments(prev => prev.map(doc => 
          doc.id === shareDocument.id ? updatedDoc : doc
        ));
        setSelectedDoc(updatedDoc);

        console.log('Sharing document:', {
          document: shareDocument.title,
          permission: shareData.permission,
          shareWith: shareData.shareWith.map(contact => contact.name)
        });
        // In a real app, this would make an API call to share the document
        handleShareDialogClose();
      }
    };

    const handlePermissionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setShareData(prev => ({
        ...prev,
        permission: event.target.value as 'read' | 'write'
      }));
    };

    const handleContactsChange = (_event: unknown, newValue: Contact[]) => {
      setShareData(prev => ({
        ...prev,
        shareWith: newValue
      }));
    };

    const handleRemoveShare = (contactId: string) => {
      if (shareDocument) {
        const updatedDoc = {
          ...shareDocument,
          sharedWith: shareDocument.sharedWith?.filter(share => share.contact.id !== contactId) || []
        };

        setDocuments(prev => prev.map(doc => 
          doc.id === shareDocument.id ? updatedDoc : doc
        ));
        setSelectedDoc(updatedDoc);
        setShareDocument(updatedDoc);

        console.log('Removing share for contact:', contactId);
        // In a real app, this would make an API call to remove the share
      }
    };

    const renderDocumentItem = (doc: Document, level: number = 0) => {
      const hasChildren = doc.children && doc.children.length > 0;
      const isExpanded = expandedItems.has(doc.id);
      const isSelected = selectedDoc?.id === doc.id;
      const isHovered = hoveredDoc === doc.id;

      if (isMobile) {
        // Mobile collapsed view - icon only
        const documentItem = (
          <ListItemButton
            selected={isSelected}
            onClick={() => setSelectedDoc(doc)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              px: 1,
              minHeight: 48,
              justifyContent: 'center',
              '&.Mui-selected': {
                backgroundColor: 'action.selected',
                '&:hover': {
                  backgroundColor: 'action.selected',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 'auto', justifyContent: 'center' }}>
              {hasChildren ? (
                <Folder sx={{ color: 'primary.main' }} />
              ) : (
                <Description sx={{ color: 'text.secondary' }} />
              )}
            </ListItemIcon>
          </ListItemButton>
        );

        return (
          <Box key={doc.id}>
            <ListItem disablePadding>
              <Tooltip title={doc.title} placement="right">
                {documentItem}
              </Tooltip>
            </ListItem>
            {/* Show children collapsed in mobile too */}
            {hasChildren && isExpanded && (
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List disablePadding>
                  {doc.children!.map(child => renderDocumentItem(child, level + 1))}
                </List>
              </Collapse>
            )}
          </Box>
        );
      }

      // Desktop expanded view
      return (
        <Box key={doc.id}>
          <ListItem
            disablePadding
            sx={{ pl: level * 2 }}
            onMouseEnter={() => setHoveredDoc(doc.id)}
            onMouseLeave={() => setHoveredDoc(null)}
          >
            <ListItemButton
              selected={isSelected}
              onClick={() => setSelectedDoc(doc)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                pr: 1,
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {hasChildren ? (
                  <Folder sx={{ color: 'primary.main' }} />
                ) : (
                  <Description sx={{ color: 'text.secondary' }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={doc.title}
                secondary={`Modified ${doc.lastModified.toLocaleDateString()}`}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: isSelected ? 600 : 400,
                }}
                secondaryTypographyProps={{
                  fontSize: '0.75rem',
                }}
              />
              {/* Action buttons that appear on hover */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.2s',
                  ml: 'auto',
                }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddNewChildDoc(doc);
                  }}
                  sx={{
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Add sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, doc)}
                  sx={{
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <MoreHoriz sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
              {/* Expand/collapse button for folders */}
              {hasChildren && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleExpand(doc.id);
                  }}
                  sx={{ ml: 1 }}
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
            </ListItemButton>
          </ListItem>
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List disablePadding>
                {doc.children!.map(child => renderDocumentItem(child, level + 1))}
              </List>
            </Collapse>
          )}
        </Box>
      );
    };

    return (
      <Box ref={ref} sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 300px)', mt: 3 }}>
        {/* Side Menu */}
        <Paper
          sx={{
            width: isMobile ? 64 : 280,
            p: isMobile ? 1 : 2,
            overflow: 'auto',
            backgroundColor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          {!isMobile && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, px: 1 }}>
                <Typography variant="h6">
                  My Documents
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleAddNewDoc}
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
              <Divider sx={{ mb: 2 }} />
            </>
          )}
          <List sx={{ py: isMobile ? 0 : 1 }}>
            {/* New document input field */}
            {showNewDocInput && !isMobile && (
              <ListItem disablePadding sx={{ mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter document title..."
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={handleCancelNewDoc}
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.875rem',
                    }
                  }}
                />
              </ListItem>
            )}
            {documents.map(doc => renderDocumentItem(doc))}
          </List>
        </Paper>

        {/* Document Content */}
        <Paper
          sx={{
            flex: 1,
            p: 3,
            overflow: 'auto',
            backgroundColor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}
        >
          {selectedDoc ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {selectedDoc.title}
                </Typography>
                {!isEditing && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleStartEditing}
                    sx={{ ml: 2 }}
                  >
                    Edit
                  </Button>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                Last modified: {selectedDoc.lastModified.toLocaleDateString()}
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {isEditing ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    minRows={20}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleEditKeyPress}
                    placeholder="Start writing your document here..."
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveEdit}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  onClick={handleStartEditing}
                  sx={{
                    cursor: 'text',
                    minHeight: '400px',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    p: 1,
                    borderRadius: 1,
                    '& h1': { fontSize: '2rem', fontWeight: 600, mb: 2, mt: 3 },
                    '& h2': { fontSize: '1.5rem', fontWeight: 600, mb: 1.5, mt: 2.5 },
                    '& h3': { fontSize: '1.25rem', fontWeight: 600, mb: 1, mt: 2 },
                    '& p': { mb: 1.5, lineHeight: 1.6 },
                    '& ul, & ol': { mb: 1.5, pl: 3 },
                    '& li': { mb: 0.5 },
                    '& strong': { fontWeight: 600 },
                  }}
                >
                  {selectedDoc.content.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={index}>{line.substring(2)}</h1>;
                    } else if (line.startsWith('## ')) {
                      return <h2 key={index}>{line.substring(3)}</h2>;
                    } else if (line.startsWith('### ')) {
                      return <h3 key={index}>{line.substring(4)}</h3>;
                    } else if (line.startsWith('- ')) {
                      return (
                        <ul key={index}>
                          <li>{line.substring(2)}</li>
                        </ul>
                      );
                    } else if (line.match(/^\d+\. /)) {
                      return (
                        <ol key={index}>
                          <li>{line.substring(line.indexOf('. ') + 2)}</li>
                        </ol>
                      );
                    } else if (line.includes('**')) {
                      const parts = line.split('**');
                      return (
                        <p key={index}>
                          {parts.map((part, i) =>
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                          )}
                        </p>
                      );
                    } else if (line.trim()) {
                      return <p key={index}>{line}</p>;
                    }
                    return null;
                  })}
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="h6" color="text.secondary">
                Select a document to view
              </Typography>
            </Box>
          )}
        </Paper>

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
          <MenuItem onClick={() => handleMenuAction('share')}>
            <ListItemIcon>
              <Share fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleMenuAction('rename')}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('duplicate')}>
            <ListItemIcon>
              <FileCopy fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleMenuAction('delete')}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete" sx={{ color: 'error.main' }} />
          </MenuItem>
        </Menu>

        {/* Share Dialog */}
        <Dialog
          open={showShareDialog}
          onClose={handleShareDialogClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            Share Document: {shareDocument?.title}
          </DialogTitle>
          <DialogContent sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              {/* Permission Selection */}
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', fontWeight: 600 }}>
                  Permission Level
                </FormLabel>
                <RadioGroup
                  value={shareData.permission}
                  onChange={handlePermissionChange}
                  row
                >
                  <FormControlLabel
                    value="read"
                    control={<Radio size="small" />}
                    label="Read only"
                  />
                  <FormControlLabel
                    value="write"
                    control={<Radio size="small" />}
                    label="Read & Write"
                  />
                </RadioGroup>
              </FormControl>

              {/* Share With */}
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 1, fontSize: '0.875rem', fontWeight: 600 }}>
                  Share with
                </FormLabel>
                <Autocomplete
                  multiple
                  options={mockContacts.filter(contact => 
                    !shareDocument?.sharedWith?.some(share => share.contact.id === contact.id)
                  )}
                  getOptionLabel={(option) => option.name}
                  value={shareData.shareWith}
                  onChange={handleContactsChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Type to search contacts and groups..."
                      size="small"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.name}
                        size="small"
                        color={option.type === 'group' ? 'primary' : 'default'}
                        variant={option.type === 'group' ? 'filled' : 'outlined'}
                      />
                    ))
                  }
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.type === 'person' ? option.email : 'Group'}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                />
              </FormControl>

              {/* Existing Shares */}
              {shareDocument?.sharedWith && shareDocument.sharedWith.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Currently shared with
                  </Typography>
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                    {shareDocument.sharedWith.map((share, index) => (
                      <Box key={share.contact.id}>
                        <ListItem
                          sx={{
                            py: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <Box sx={{ mr: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {share.contact.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {share.contact.type === 'person' ? share.contact.email : 'Group'} • 
                                {share.permission === 'read' ? ' Can view' : ' Can edit'} • 
                                Shared {share.sharedAt.toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={share.permission === 'read' ? 'View' : 'Edit'}
                              size="small"
                              color={share.permission === 'write' ? 'primary' : 'default'}
                              variant="outlined"
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveShare(share.contact.id)}
                              sx={{
                                color: 'error.main',
                                '&:hover': {
                                  backgroundColor: 'error.light',
                                  color: 'error.contrastText',
                                }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItem>
                        {index < shareDocument.sharedWith!.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleShareDialogClose} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleShareSubmit}
              variant="contained"
              disabled={shareData.shareWith.length === 0}
            >
              Share
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
);

MyDocs.displayName = 'MyDocs';