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
} from '@mui/material';
import {
  UilFileAlt as Description,
  UilAngleUp as ExpandLess,
  UilAngleDown as ExpandMore,
  UilFolder as Folder,
  UilPlus as Add,
  UilEllipsisH as MoreHoriz,
  UilEdit as Edit,
  UilTrashAlt as Delete,
  UilCopy as FileCopy,
} from '@iconscout/react-unicons';

interface Document {
  id: string;
  title: string;
  content: string;
  lastModified: Date;
  children?: Document[];
}

const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'Group Charter',
    content: `# Group Charter

## Purpose
This document outlines the purpose, values, and operating principles of our group.

## Mission Statement
We are committed to fostering collaboration, innovation, and mutual support among our members.

## Core Values
- **Transparency**: Open communication and sharing of information
- **Respect**: Valuing diverse perspectives and experiences
- **Innovation**: Encouraging creative problem-solving
- **Collaboration**: Working together towards common goals

## Operating Principles
1. All decisions will be made through consensus when possible
2. Regular meetings will be held monthly
3. All members have equal voice and voting rights
4. Resources will be shared equitably among members`,
    lastModified: new Date('2025-08-10'),
  },
  {
    id: '2',
    title: 'Meeting Notes',
    content: `# Meeting Notes Archive

This section contains notes from our regular group meetings.`,
    lastModified: new Date('2025-08-12'),
    children: [
      {
        id: '2.1',
        title: 'August 2025 Meeting',
        content: `# August 2025 Meeting Notes

**Date**: August 5, 2025
**Attendees**: 15 members present

## Agenda Items

### 1. Welcome New Members
- Introduced 3 new members to the group
- Reviewed onboarding process and resources

### 2. Project Updates
- Community Garden Project: 75% complete
- Workshop Series: Successfully launched with 50+ attendees
- Resource Library: Added 20 new resources this month

### 3. Upcoming Events
- Annual Summit: September 15-17
- Networking Mixer: August 25
- Skills Workshop: August 30

## Action Items
- [ ] Finalize summit agenda (Due: Aug 20)
- [ ] Send workshop feedback survey (Due: Aug 10)
- [ ] Update member directory (Due: Aug 15)`,
        lastModified: new Date('2025-08-05'),
      },
    ],
  },
  {
    id: '3',
    title: 'Resource Directory',
    content: `# Resource Directory

## Shared Tools and Resources

### Communication Tools
- **Primary Channel**: NAO Group Chat
- **Video Meetings**: Weekly Zoom calls
- **Document Sharing**: This docs section

### Educational Resources
1. **Getting Started Guide** - For new members
2. **Best Practices Handbook** - Collaboration guidelines
3. **Technical Documentation** - Platform tutorials

### Templates
- Project Proposal Template
- Meeting Agenda Template
- Progress Report Template

### External Resources
- Partner Organizations Directory
- Funding Opportunities Database
- Skills Exchange Board`,
    lastModified: new Date('2025-08-14'),
  },
  {
    id: '4',
    title: 'Project Roadmap',
    content: `# Project Roadmap 2025

## Q3 2025 (July - September)
### In Progress
- **Community Garden Expansion**
  - Status: 75% complete
  - Target: September 30
  
- **Member Skills Database**
  - Status: Design phase
  - Target: Launch in Q4

### Completed
- ✓ Workshop Series Launch
- ✓ New Member Onboarding System
- ✓ Website Redesign

## Q4 2025 (October - December)
### Planned
- Annual Impact Report
- Holiday Community Event
- Strategic Planning Session for 2026

## Long-term Vision (2026 and beyond)
- Expand to 500+ active members
- Launch mentorship program
- Establish physical community space
- Create sustainable funding model`,
    lastModified: new Date('2025-08-13'),
  },
];

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GroupDocsProps {}

export const GroupDocs = forwardRef<HTMLDivElement, GroupDocsProps>(
  (_, ref) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [selectedDoc, setSelectedDoc] = useState<Document>(mockDocuments[0]);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['2']));
    const [hoveredDoc, setHoveredDoc] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [menuDoc, setMenuDoc] = useState<Document | null>(null);

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

    const handleAddNewDoc = (parentDoc: Document) => {
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
      console.log(`${action} document:`, menuDoc?.title);
      handleMenuClose();
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
                    handleAddNewDoc(doc);
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
      <Box ref={ref} sx={{ display: 'flex', gap: 2, mt: 3 }}>
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
              <Typography variant="h6" sx={{ mb: 2, px: 1 }}>
                Documents
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </>
          )}
          <List sx={{ py: isMobile ? 0 : 1 }}>
            {mockDocuments.map(doc => renderDocumentItem(doc))}
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
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                {selectedDoc.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                Last modified: {selectedDoc.lastModified.toLocaleDateString()}
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Box
                sx={{
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
      </Box>
    );
  }
);

GroupDocs.displayName = 'GroupDocs';