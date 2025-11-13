import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, TextField, InputAdornment, IconButton, Grid,
  Card, CardContent, Button, Switch, Chip, Avatar,
  Badge, List, ListItem, ListItemAvatar, ListItemText, Tooltip,
  Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, ListItemIcon, ListItemButton, alpha, useTheme, SpeedDial,
  SpeedDialAction, SpeedDialIcon, useMediaQuery,Paper,FormControlLabel,Divider
} from '@mui/material';
import {
  UilBolt, UilSearch, UilArrowUp, UilPlus, UilEnvelope, UilUsersAlt, UilUserPlus,
  UilBell, UilClock, UilUser, UilArrowRight, UilRss, UilFileAlt,
  UilGift, UilChartLine, UilTrophy, UilUsersAlt as UilHandshake, UilTimes, UilDraggabledots,
  UilFileEditAlt, UilTag, UilShoppingCart, UilMessage, UilSetting, UilApps, UilEstate
} from '@iconscout/react-unicons';
import { useAI } from '@/hooks/useAI';
import {useContactData} from "@/hooks/contacts/useContactData.ts";
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";

const HomePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [query, setQuery] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'widgets' | 'zen'>('zen');
  const [widgetMenuAnchor, setWidgetMenuAnchor] = useState<null | HTMLElement>(null);
  const [addWidgetDialog, setAddWidgetDialog] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ widgetId: string; position: 'before' | 'after' } | null>(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  // Quick Actions modal states
  const [createPostDialog, setCreatePostDialog] = useState(false);
  const [sendMessageDialog, setSendMessageDialog] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<string>('');
  const [messageContent, setMessageContent] = useState<string>('');

  // Layout settings
  const [columnLayout, setColumnLayout] = useState<'1-col' | '2-1-col' | '1-2-col' | '3-col'>('2-1-col');
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<null | HTMLElement>(null);
  
  const { promptStream } = useAI(false);
  const streamingMessageIdRef = useRef<string | null>(null);

  const {contact} = useContactData(null, true);


  // Constants
  const name = resolveFrom(contact, "name");
  const firstName = name?.firstName;
  const exampleQueries = [
    'Who in my network can help me with ...',
    'Which of my contacts needs my help?',
    'Show my notifications'
  ];
  
  // Default widget configuration
  const defaultWidgets = [
    { id: 'ai-chat', name: 'AI Chat / Smart Command Bar', enabled: true, column: 'col1' },
    { id: 'my-stream', name: 'My Stream', enabled: true, column: 'col1' },
    { id: 'network-summary', name: 'Network Summary', enabled: true, column: 'col2' },
    { id: 'quick-actions', name: 'Quick Actions', enabled: true, column: 'col2' },
    { id: 'recent-activity', name: 'Recent Activity', enabled: true, column: 'col2' },
    { id: 'group-activity', name: 'Group Activity', enabled: true, column: 'col3' },
    { id: 'anniversaries', name: 'Anniversaries', enabled: true, column: 'col3' },
    { id: 'my-docs', name: 'My Docs', enabled: true, column: 'col3' }
  ];

  const [availableWidgets, setAvailableWidgets] = useState(defaultWidgets);

  // Save widget configuration to localStorage
  const saveWidgetsToStorage = useCallback((widgets: typeof availableWidgets) => {
    try {
      localStorage.setItem('nao-homepage-widgets', JSON.stringify(widgets));
    } catch (error) {
      console.warn('Failed to save widgets to localStorage:', error);
    }
  }, []);

  // Load view mode and column layout preferences from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('nao-homepage-mode') as 'widgets' | 'zen' | null;
    if (savedMode) {
      setViewMode(savedMode);
    }
    
    const savedLayout = localStorage.getItem('nao-homepage-layout') as '1-col' | '2-1-col' | '1-2-col' | '3-col' | null;
    if (savedLayout) {
      setColumnLayout(savedLayout);
    }
  }, []);

  // Load widget configuration from localStorage
  useEffect(() => {
    const savedWidgets = localStorage.getItem('nao-homepage-widgets');
    if (savedWidgets) {
      try {
        const parsedWidgets = JSON.parse(savedWidgets);
        // Merge with default widgets to ensure all widgets exist and have required properties
        const mergedWidgets = defaultWidgets.map(defaultWidget => {
          const savedWidget = parsedWidgets.find((w: any) => w.id === defaultWidget.id);
          if (savedWidget) {
            // Migrate old column names to new format
            let migratedColumn = savedWidget.column;
            if (savedWidget.column === 'main') {
              migratedColumn = 'col1';
            } else if (savedWidget.column === 'sidebar') {
              migratedColumn = 'col2';
            }
            return { ...defaultWidget, ...savedWidget, column: migratedColumn };
          }
          return defaultWidget;
        });
        setAvailableWidgets(mergedWidgets);
        // Save migrated widgets back to localStorage
        saveWidgetsToStorage(mergedWidgets);
      } catch (error) {
        console.warn('Failed to parse saved widgets, using defaults:', error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveWidgetsToStorage]);

  // Save view mode preference to localStorage
  const handleModeToggle = () => {
    const newMode = viewMode === 'widgets' ? 'zen' : 'widgets';
    setViewMode(newMode);
    localStorage.setItem('nao-homepage-mode', newMode);
  };

  // Handle column layout change
  const handleLayoutChange = (layout: '1-col' | '2-1-col' | '1-2-col' | '3-col') => {
    setColumnLayout(layout);
    localStorage.setItem('nao-homepage-layout', layout);
    setLayoutMenuAnchor(null);
  };
  
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsLoading(true);

      try {
        await promptStream(
          [{role: 'user', content: query}],
          // onStreamStart
          () => {
            console.log('Stream started');
          },
          // onStreamChunk
          (delta: string, accumulated: string) => {
            setResponse(accumulated);
          },
          // onStreamEnd
          (content: string) => {
            console.log('Stream ended:', content);
            streamingMessageIdRef.current = null;
          }
        );
      } catch (error) {
        console.error('Error getting AI response:', error);
        // Update the message with error content
        setResponse('Sorry, I encountered an error. Please try again.');
        streamingMessageIdRef.current = null;
      } finally {
        setQuery('');
        setIsLoading(false);
      }
    };
  };

  const toggleWidget = (widgetId: string) => {
    setAvailableWidgets(prev => {
      const updated = prev.map(widget => 
        widget.id === widgetId ? { ...widget, enabled: !widget.enabled } : widget
      );
      saveWidgetsToStorage(updated);
      return updated;
    });
  };

  const handleDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDropIndicator(null);
  };

  const handleDragOver = (e: React.DragEvent, widgetId: string, position: 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation(); // Prevent column handlers from interfering
    if (draggedWidget && draggedWidget !== widgetId) {
      setDropIndicator({ widgetId, position });
    }
  };


  const handleDrop = (e: React.DragEvent, targetWidgetId: string, position: 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation(); // Prevent column handlers from interfering
    if (!draggedWidget || draggedWidget === targetWidgetId) return;

    setAvailableWidgets(prev => {
      const widgets = [...prev];
      const draggedIndex = widgets.findIndex(w => w.id === draggedWidget);
      const targetIndex = widgets.findIndex(w => w.id === targetWidgetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      // Get the target widget's column
      const targetWidget = widgets[targetIndex];
      const draggedItem = widgets[draggedIndex];
      
      // Remove dragged widget
      widgets.splice(draggedIndex, 1);
      
      // Update dragged widget's column to match target
      draggedItem.column = targetWidget.column;
      
      // Calculate new insertion index (after removal)
      let insertIndex = targetIndex;
      if (draggedIndex < targetIndex) {
        insertIndex = targetIndex - 1;
      }
      
      // Adjust for before/after position
      if (position === 'after') {
        insertIndex += 1;
      }
      
      // Insert at calculated position
      widgets.splice(insertIndex, 0, draggedItem);
      
      // Save updated configuration to localStorage
      saveWidgetsToStorage(widgets);
      
      return widgets;
    });

    setDraggedWidget(null);
    setDropIndicator(null);
  };

  const handleDropToEmptyColumn = (e: React.DragEvent, targetColumn: 'col1' | 'col2' | 'col3') => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedWidget) return;

    setAvailableWidgets(prev => {
      const widgets = [...prev];
      const draggedIndex = widgets.findIndex(w => w.id === draggedWidget);
      
      if (draggedIndex === -1) return prev;

      const draggedItem = widgets[draggedIndex];
      
      // Update dragged widget's column to target column
      draggedItem.column = targetColumn;
      
      // Save updated configuration to localStorage
      saveWidgetsToStorage(widgets);
      
      return widgets;
    });

    setDraggedWidget(null);
    setDropIndicator(null);
  };

  // Common styles for reuse
  const commonStyles = {
    hoverItem: {
      cursor: 'pointer', p: 1, borderRadius: 1,
      transition: 'background-color 0.2s ease',
      '&:hover': { backgroundColor: 'action.hover' }
    },
    docItem: {
      cursor: 'pointer', p: 0.5, borderRadius: 1,
      transition: 'background-color 0.2s ease, color 0.2s ease',
      '&:hover': { backgroundColor: 'action.hover', color: 'text.primary' }
    }
  };

  const renderWidget = (widgetConfig: any) => {
    if (!widgetConfig.enabled) return null;

    const isDragging = draggedWidget === widgetConfig.id;
    const showDropBefore = dropIndicator?.widgetId === widgetConfig.id && dropIndicator?.position === 'before';
    const showDropAfter = dropIndicator?.widgetId === widgetConfig.id && dropIndicator?.position === 'after';

    const draggableProps = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', widgetConfig.id);
        handleDragStart(widgetConfig.id);
      },
      onDragEnd: () => {
        handleDragEnd();
      },
    };

    const cardSx = { 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      opacity: isDragging ? 0.3 : 1,
      transition: 'opacity 0.2s ease',
      '&:hover .widget-controls': { opacity: 1 },
      '&:hover': {
        boxShadow: isDragging ? 'none' : 2
      }
    };

    const boxSx = {
      position: 'relative',
      cursor: isDragging ? 'grabbing' : 'default',
      '& *': {
        cursor: isDragging ? 'grabbing' : 'inherit'
      }
    };

    // Create drop zones with visible insertion lines - positioned in the gap between widgets
    const createDropZone = (position: 'before' | 'after') => (
      <Box
        onDragOver={(e) => handleDragOver(e, widgetConfig.id, position)}
        onDrop={(e) => handleDrop(e, widgetConfig.id, position)}
        sx={{
          position: 'absolute',
          // Position entirely within the gap - 'before' starts 24px above, 'after' starts at widget bottom  
          [position === 'before' ? 'top' : 'bottom']: position === 'before' ? -24 : -24,
          left: 0,
          right: 0,
          height: 24,
          zIndex: 10,
          pointerEvents: draggedWidget && draggedWidget !== widgetConfig.id ? 'auto' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Insertion line floating in the middle of the gap */}
        <Box
          sx={{
            width: '80%',
            height: 3,
            backgroundColor: 'primary.main',
            borderRadius: 2,
            opacity: (showDropBefore && position === 'before') || (showDropAfter && position === 'after') ? 1 : 0,
            transition: 'opacity 0.2s ease',
            boxShadow: (showDropBefore && position === 'before') || (showDropAfter && position === 'after') ? `0 0 8px ${alpha(theme.palette.primary.main, 0.5)}` : 'none'
          }}
        />
      </Box>
    );

    const widgetControls = (
      <Box 
        className="widget-controls"
        sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          display: 'flex',
          gap: 0.5,
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 1
        }}
      >
        <Tooltip title="Drag to reorder">
          <IconButton 
            size="small" 
            sx={{ 
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' }
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <UilDraggabledots size="20" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove widget">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              toggleWidget(widgetConfig.id);
            }}
          >
            <UilTimes size="20" />
          </IconButton>
        </Tooltip>
      </Box>
    );

    let widgetContent;
    
    switch (widgetConfig.id) {
      case 'ai-chat':
        widgetContent = (
          <Box sx={boxSx} {...draggableProps}>
            {createDropZone('before')}
            <Card sx={cardSx}>
              {widgetControls}
              <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    AI
                  </Typography>
                  <Switch
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    size="small"
                    sx={{ mr: 2 }}
                  />
                  {aiEnabled ? (
                    <UilBolt size="24" style={{ marginRight: '8px', color: 'inherit' }} />
                  ) : (
                    <UilSearch size="24" style={{ marginRight: '8px', color: 'inherit' }} />
                  )}
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {aiEnabled ? 'AI Assistant' : 'Smart Command Bar'}
                  </Typography>
                </Box>
                
                {response ? (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {response}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                      Hello there,
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                      {aiEnabled ? 'What would you like to do today?' : 'Search contacts, groups, or navigate quickly'}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {(aiEnabled ? exampleQueries : [
                        'Search contacts by name or skill',
                        'Find groups or conversations',
                        'Navigate to notifications or messages'
                      ]).map((example, index) => (
                        <Typography
                          key={index}
                          variant="body2"
                          onClick={() => setQuery(example)}
                          sx={{
                            color: 'text.secondary',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontStyle: 'italic',
                            pl: 2,
                            py: 0.5,
                            borderRadius: 1,
                            transition: 'color 0.2s ease, background-color 0.2s ease',
                            '&:hover': { 
                              color: 'text.primary',
                              backgroundColor: 'action.hover'
                            },
                            '&:before': { content: '"•"', position: 'absolute', left: 0, ml: 1 },
                            position: 'relative'
                          }}
                        >
                          {example}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                <Box component="form" onSubmit={handleQuerySubmit}>
                  <TextField
                    fullWidth
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={aiEnabled ? "Type anything..." : "Search or navigate..."}
                    variant="outlined"
                    disabled={isLoading}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="submit"
                            disabled={!query.trim() || isLoading}
                            size="small"
                            sx={{
                              backgroundColor: query.trim() ? 'primary.main' : 'action.disabledBackground',
                              color: query.trim() ? 'primary.contrastText' : 'action.disabled',
                              '&:hover': {
                                backgroundColor: query.trim() ? 'primary.dark' : 'action.disabledBackground',
                              },
                              width: 32,
                              height: 32,
                            }}
                          >
                            <UilArrowUp size="16" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
            {createDropZone('after')}
          </Box>
        );
        break;

      case 'network-summary':
        widgetContent = (
          <Box sx={boxSx} {...draggableProps}>
            {createDropZone('before')}
            <Card sx={cardSx}>
              {widgetControls}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UilUser size="24" style={{ marginRight: '8px', color: 'inherit' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Network Summary
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ ...commonStyles.hoverItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => console.log('Navigate to contacts')}>
                    <Typography variant="body2" color="text.secondary">Contacts</Typography>
                    <Chip label="47" size="small" color="primary" />
                  </Box>
                  <Box sx={{ ...commonStyles.hoverItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => console.log('Navigate to connections')}>
                    <Typography variant="body2" color="text.secondary">Connections</Typography>
                    <Chip label="23" size="small" color="success" />
                  </Box>
                  <Box sx={{ ...commonStyles.hoverItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => console.log('Navigate to vouches & praises')}>
                    <Typography variant="body2" color="text.secondary">Vouches & Praises</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip label="12" size="small" icon={<UilTrophy size="16" />} />
                      <Chip label="8" size="small" icon={<UilHandshake size="16" />} />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            {createDropZone('after')}
          </Box>
        );
        break;

      case 'quick-actions': {
        const isInSidebar = widgetConfig.column !== 'col1';
        widgetContent = (
          <Box sx={boxSx} {...draggableProps}>
            {createDropZone('before')}
            <Card sx={cardSx}>
              {widgetControls}
              <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Quick Actions
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: isInSidebar ? 'column' : 'row',
                  flexWrap: isInSidebar ? 'nowrap' : 'wrap',
                  gap: 1.5 
                }}>
                  <Button
                    variant="contained"
                    startIcon={<UilPlus size="20" />}
                    fullWidth={isInSidebar}
                    sx={!isInSidebar ? { flex: '1 1 calc(50% - 6px)' } : {}}
                    onClick={() => setCreatePostDialog(true)}
                  >
                    Create Post
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<UilEnvelope size="20" />}
                    fullWidth={isInSidebar}
                    sx={!isInSidebar ? { flex: '1 1 calc(50% - 6px)' } : {}}
                    onClick={() => setSendMessageDialog(true)}
                  >
                    Send Message
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<UilUserPlus size="20" />}
                    fullWidth={isInSidebar}
                    sx={!isInSidebar ? { flex: '1 1 calc(50% - 6px)' } : {}}
                    onClick={handleAddContact}
                  >
                    Add Contact
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<UilUsersAlt size="20" />}
                    fullWidth={isInSidebar}
                    sx={!isInSidebar ? { flex: '1 1 calc(50% - 6px)' } : {}}
                    onClick={handleCreateGroup}
                  >
                    Create Group
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<UilFileAlt size="20" />}
                    fullWidth={isInSidebar}
                    sx={!isInSidebar ? { flex: '1 1 calc(50% - 6px)' } : {}}
                    onClick={handleCreateDoc}
                  >
                    Create Doc
                  </Button>
                </Box>
              </CardContent>
            </Card>
            {createDropZone('after')}
          </Box>
        );
        break;
      }

      case 'my-stream':
        widgetContent = (
          <Box sx={boxSx} {...draggableProps}>
            {createDropZone('before')}
            <Card sx={cardSx}>
              {widgetControls}
              <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UilRss size="24" style={{ marginRight: '8px', color: 'inherit' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    My Stream
                  </Typography>
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
                    <Typography variant="body2" color="text.secondary">
                      Just shipped a new feature for our React dashboard! The drag-and-drop interface is finally working perfectly. 🚀
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
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  endIcon={<UilArrowRight size="20" />}
                  sx={{ 
                    mt: 2,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onClick={() => console.log('Navigate to all posts')}
                >
                  View All Posts
                </Button>
              </CardContent>
            </Card>
            {createDropZone('after')}
          </Box>
        );
        break;

      case 'recent-activity':
        widgetContent = (
          <Box sx={boxSx} {...draggableProps}>
            {createDropZone('before')}
            <Card sx={cardSx}>
              {widgetControls}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UilClock size="24" style={{ marginRight: '8px', color: 'inherit' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Recent Activity
                  </Typography>
                </Box>
                <List sx={{ py: 0 }}>
                  <ListItem 
                    sx={{ 
                      px: 0,
                      cursor: 'pointer',
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => console.log('Navigate to message from Alex')}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Alex sent you a message"
                      secondary="2 minutes ago"
                      primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 500 } }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                  <ListItem 
                    sx={{ 
                      px: 0,
                      cursor: 'pointer',
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => console.log('Navigate to connection request')}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={1} color="error">
                        <UilBell size="32" style={{ color: 'inherit' }} />
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary="New connection request"
                      secondary="1 hour ago"
                      primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 500 } }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                  <ListItem 
                    sx={{ 
                      px: 0,
                      cursor: 'pointer',
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => console.log('Navigate to matchmaking suggestion')}
                  >
                    <ListItemAvatar>
                      <UilChartLine size="32" style={{ color: 'inherit' }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary="Sarah might be interested in your React skills"
                      secondary="Matchmaking suggestion • 3 hours ago"
                      primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 500 } }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
            {createDropZone('after')}
          </Box>
        );
        break;

      case 'group-activity':
        widgetContent = (
          <Box sx={boxSx} {...draggableProps}>
            {createDropZone('before')}
            <Card sx={cardSx}>
              {widgetControls}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UilUsersAlt size="24" style={{ marginRight: '8px', color: 'inherit' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Group Activity
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => console.log('Navigate to React Devs group')}
                  >
                    <Chip label="React Devs" size="small" color="primary" />
                    <Typography variant="caption" color="text.secondary">
                      3 new messages
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => console.log('Navigate to Design Team group')}
                  >
                    <Chip label="Design Team" size="small" />
                    <Typography variant="caption" color="text.secondary">
                      New member joined
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => console.log('Navigate to Startup Network group')}
                  >
                    <Chip label="Startup Network" size="small" />
                    <Typography variant="caption" color="text.secondary">
                      Event scheduled
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            {createDropZone('after')}
          </Box>
        );
        break;

      case 'anniversaries':
        widgetContent = (
          <Box sx={boxSx} {...draggableProps}>
            {createDropZone('before')}
            <Card sx={cardSx}>
              {widgetControls}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UilGift size="24" style={{ marginRight: '8px', color: 'inherit' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Anniversaries
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => console.log('Navigate to Jessica profile')}
                  >
                    <Avatar sx={{ width: 24, height: 24 }}>J</Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Jessica's birthday
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tomorrow
                      </Typography>
                    </Box>
                  </Box>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => console.log('Navigate to David profile')}
                  >
                    <Avatar sx={{ width: 24, height: 24 }}>D</Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Work anniversary
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        David • 3 days
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            {createDropZone('after')}
          </Box>
        );
        break;

      case 'my-docs':
        widgetContent = (
          <Box sx={boxSx} {...draggableProps}>
            {createDropZone('before')}
            <Card sx={cardSx}>
              {widgetControls}
              <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UilFileAlt size="24" style={{ marginRight: '8px', color: 'inherit' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    My Docs
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Recent documents
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={commonStyles.docItem}
                      onClick={() => console.log('Open Project Proposal.pdf')}>• Project Proposal.pdf</Typography>
                    <Typography variant="caption" color="text.secondary" sx={commonStyles.docItem}
                      onClick={() => console.log('Open Meeting Notes.md')}>• Meeting Notes.md</Typography>
                    <Typography variant="caption" color="text.secondary" sx={commonStyles.docItem}
                      onClick={() => console.log('Open Skills Assessment.docx')}>• Skills Assessment.docx</Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  endIcon={<UilArrowRight size="20" />}
                >
                  View All Docs
                </Button>
              </CardContent>
            </Card>
            {createDropZone('after')}
          </Box>
        );
        break;

      default:
        widgetContent = null;
        break;
    }

    return widgetContent;
  };

  // Widget Dashboard Mode - flexible column layouts
  const renderWidgetMode = () => {
    const enabledWidgets = availableWidgets.filter(w => w.enabled);
    const col1Widgets = enabledWidgets.filter(w => w.column === 'col1');
    const col2Widgets = enabledWidgets.filter(w => w.column === 'col2');
    const col3Widgets = enabledWidgets.filter(w => w.column === 'col3');
    
    const renderColumn = (widgets: typeof enabledWidgets, colSize: number, columnId: 'col1' | 'col2' | 'col3') => (
      <Grid size={{ xs: 12, md: colSize }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative', minHeight: 100 }}>
          {/* Empty column drop zone - shown when column has no widgets */}
          {draggedWidget && widgets.length === 0 && (
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndicator({ widgetId: `empty-${columnId}`, position: 'before' });
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropToEmptyColumn(e, columnId);
              }}
              sx={{
                minHeight: 200,
                border: '2px dashed',
                borderColor: dropIndicator?.widgetId === `empty-${columnId}` ? 'primary.main' : 'divider',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: dropIndicator?.widgetId === `empty-${columnId}` ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                {dropIndicator?.widgetId === `empty-${columnId}` ? 'Drop widget here' : 'Empty column'}
              </Typography>
            </Box>
          )}

          {/* Top edge drop zone - only when column has widgets and dragged widget is from different column */}
          {draggedWidget && widgets.length > 0 && availableWidgets.find(w => w.id === draggedWidget)?.column !== columnId && (
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndicator({ widgetId: widgets[0].id, position: 'before' });
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(e, widgets[0].id, 'before');
              }}
              sx={{
                position: 'absolute',
                top: -12,
                left: 0,
                right: 0,
                height: 24,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  width: '80%',
                  height: 3,
                  backgroundColor: 'primary.main',
                  borderRadius: 2,
                  opacity: dropIndicator?.widgetId === widgets[0].id && dropIndicator?.position === 'before' ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                  boxShadow: dropIndicator?.widgetId === widgets[0].id && dropIndicator?.position === 'before' ? `0 0 8px ${alpha(theme.palette.primary.main, 0.5)}` : 'none'
                }}
              />
            </Box>
          )}
          
          {widgets.map((widget) => (
            <Box key={widget.id}>
              {renderWidget(widget)}
            </Box>
          ))}
          
          {/* Bottom edge drop zone - only when column has widgets and dragged widget is from different column */}
          {draggedWidget && widgets.length > 0 && availableWidgets.find(w => w.id === draggedWidget)?.column !== columnId && (
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndicator({ widgetId: widgets[widgets.length - 1].id, position: 'after' });
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(e, widgets[widgets.length - 1].id, 'after');
              }}
              sx={{
                position: 'absolute',
                bottom: -12,
                left: 0,
                right: 0,
                height: 24,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  width: '80%',
                  height: 3,
                  backgroundColor: 'primary.main',
                  borderRadius: 2,
                  opacity: dropIndicator?.widgetId === widgets[widgets.length - 1].id && dropIndicator?.position === 'after' ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                  boxShadow: dropIndicator?.widgetId === widgets[widgets.length - 1].id && dropIndicator?.position === 'after' ? `0 0 8px ${alpha(theme.palette.primary.main, 0.5)}` : 'none'
                }}
              />
            </Box>
          )}
        </Box>
      </Grid>
    );
    
    return (
      <Box sx={{ py: 3, height: '100%', overflow: 'auto', px: 3 }}>
        <Grid container spacing={4}>
          {columnLayout === '1-col' && (
            <>
              {renderColumn([...col1Widgets, ...col2Widgets, ...col3Widgets], 12, 'col1')}
            </>
          )}
          
          {columnLayout === '2-1-col' && (
            <>
              {renderColumn(col1Widgets, 8, 'col1')}
              {renderColumn([...col2Widgets, ...col3Widgets], 4, 'col2')}
            </>
          )}
          
          {columnLayout === '1-2-col' && (
            <>
              {renderColumn([...col1Widgets, ...col2Widgets], 4, 'col1')}
              {renderColumn(col3Widgets, 8, 'col3')}
            </>
          )}
          
          {columnLayout === '3-col' && (
            <>
              {renderColumn(col1Widgets, 4, 'col1')}
              {renderColumn(col2Widgets, 4, 'col2')}
              {renderColumn(col3Widgets, 4, 'col3')}
            </>
          )}
        </Grid>
      </Box>
    );
  };

  // Zen Mode - Similar to current AI chat but cleaner
  const renderZenMode = () => (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Container maxWidth="md" sx={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column',
        pt: { xs: 3, md: 4 },
        pb: 12,
        overflow: 'auto',
        minHeight: 0
      }}>
        {response ? (
          <>
            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" sx={{ color: 'text.primary', whiteSpace: 'pre-line' }}>
                {response}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
          </>
        ) : (
          <>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                mb: 2,
                fontWeight: 600,
                color: 'text.primary'
              }}
            >
              Hi {firstName ?? "there"},
            </Typography>

            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3,
                color: 'text.primary'
              }}
            >
              What would you like to do?
            </Typography>

            {aiEnabled && (
              <Box sx={{ mb: 4 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    mb: 1.5,
                    fontSize: '0.875rem'
                  }}
                >
                  Try asking:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {exampleQueries.map((example, index) => (
                    <Typography
                      key={index}
                      variant="body2"
                      onClick={() => setQuery(example)}
                      sx={{
                        color: 'text.secondary',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontStyle: 'italic',
                        pl: 2,
                        py: 0.5,
                        borderRadius: 1,
                        transition: 'color 0.2s ease, background-color 0.2s ease',
                        '&:hover': { 
                          color: 'text.primary',
                          backgroundColor: 'action.hover'
                        },
                        '&:before': { content: '"•"', position: 'absolute', left: 0, ml: 1 },
                        position: 'relative'
                      }}
                    >
                      {example}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </Container>

      <Container 
        maxWidth="md" 
        sx={{ 
          position: 'fixed',
          bottom: { xs: '60px', md: '15px' },
          left: { xs: 0, md: '280px' },
          right: 0,
          pb: 1, 
          pt: 1,
          zIndex: 1001
        }}
      >
        <Box component="form" onSubmit={handleQuerySubmit}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type anything"
            variant="outlined"
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.125rem',
                py: 1,
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton
                    onClick={() => setAiEnabled(!aiEnabled)}
                    edge="start"
                    sx={{ ml: -0.5 }}
                    disabled={isLoading}
                  >
                    {aiEnabled ? <UilBolt size="24" /> : <UilSearch size="24" />}
                  </IconButton>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="submit"
                    disabled={!query.trim() || isLoading}
                    sx={{
                      backgroundColor: query.trim() ? 'primary.main' : 'action.disabledBackground',
                      color: query.trim() ? 'primary.contrastText' : 'action.disabled',
                      '&:hover': {
                        backgroundColor: query.trim() ? 'primary.dark' : 'action.disabledBackground',
                      },
                      width: 36,
                      height: 36,
                    }}
                  >
                    <UilArrowUp size="20" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Container>
    </Box>
  );

  const handleAddWidget = (event: React.MouseEvent<HTMLElement>) => {
    setWidgetMenuAnchor(event.currentTarget);
  };

  // Quick Actions handlers
  const handleCreatePost = (type: 'post' | 'offer' | 'want') => {
    setCreatePostDialog(false);
    // Navigate to post creation with type
    window.location.href = `/#/posts/create?type=${type}`;
  };

  const handleSendMessage = () => {
    if (messageRecipient.trim() && messageContent.trim()) {
      // TODO: Implement actual message sending
      console.log('Sending message to:', messageRecipient, 'Content:', messageContent);
      setSendMessageDialog(false);
      setMessageRecipient('');
      setMessageContent('');
    }
  };

  const handleAddContact = () => {
    // Navigate to Network contacts page
    window.location.href = '/#/network/contacts/add';
  };

  const handleCreateGroup = () => {
    // Navigate to Groups create page
    window.location.href = 'http://localhost:5174/#/groups/create';
  };

  const handleCreateDoc = () => {
    // Navigate to My Docs with new document
    window.location.href = '/#/docs/create';
  };

  return (
    <Box sx={{pb: 10 }}>
      {/* Mode Toggle & Widget Controls - Desktop: Paper, Mobile: SpeedDial */}
      {isMobile ? (
        <SpeedDial
          ariaLabel="Dashboard controls"
          sx={{
            position: 'fixed',
            bottom: 76,
            right: 16,
            zIndex: 1002,
            '& .MuiSpeedDial-fab': {
              width: 56,
              height: 56,
              backgroundColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark'
              }
            },
            '& .MuiSpeedDialAction-fab': {
              width: 48,
              height: 48,
              fontSize: '1.25rem',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark'
              }
            },
            '& .MuiSpeedDialAction-staticTooltipLabel': {
              whiteSpace: 'nowrap',
              fontSize: '0.9375rem',
              fontWeight: 500,
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: 2,
              padding: '8px 12px',
              borderRadius: '8px',
              minWidth: 120
            }
          }}
          icon={<SpeedDialIcon icon={<UilApps size="24" />} />}
          open={speedDialOpen}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
        >
          <SpeedDialAction
            icon={viewMode === 'widgets' ? <UilEstate size="24" /> : <UilApps size="24" />}
            tooltipTitle={viewMode === 'widgets' ? 'Switch to Zen' : 'Switch to Widgets'}
            tooltipOpen
            onClick={() => {
              handleModeToggle();
              setSpeedDialOpen(false);
            }}
          />
          {viewMode === 'widgets' && (
            <SpeedDialAction
              icon={<UilSetting size="24" />}
              tooltipTitle="Layout Settings"
              tooltipOpen
              onClick={(e) => {
                const button = e.currentTarget;
                setLayoutMenuAnchor(button);
                setSpeedDialOpen(false);
              }}
            />
          )}
          {viewMode === 'widgets' && (
            <SpeedDialAction
              icon={<UilPlus size="24" />}
              tooltipTitle="Add Widget"
              tooltipOpen
              onClick={(e) => {
                const button = e.currentTarget;
                setWidgetMenuAnchor(button);
                setSpeedDialOpen(false);
              }}
            />
          )}
        </SpeedDial>
      ) : (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            p: 1.5,
            zIndex: 1002,
            borderRadius: 2,
            boxShadow: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          {/* Mode Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={viewMode === 'widgets'}
                onChange={handleModeToggle}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {viewMode === 'widgets' ? 'Widgets' : 'Zen'}
              </Typography>
            }
            labelPlacement="start"
          />

          {/* Widget Controls (only show in widgets mode) */}
          {viewMode === 'widgets' && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Tooltip title="Layout Settings">
                <IconButton onClick={(e) => setLayoutMenuAnchor(e.currentTarget)} size="small">
                  <UilSetting size="20" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Add Widget">
                <IconButton onClick={handleAddWidget} size="small">
                  <UilPlus size="20" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Paper>
      )}

      {/* Add Widget Menu */}
      <Menu
        anchorEl={widgetMenuAnchor}
        open={Boolean(widgetMenuAnchor)}
        onClose={() => setWidgetMenuAnchor(null)}
      >
        <MenuItem disabled>
          <Typography variant="caption" color="text.secondary">
            Add Widgets
          </Typography>
        </MenuItem>
        {availableWidgets.filter(w => !w.enabled).map((widget) => (
          <MenuItem key={widget.id} onClick={() => {
            toggleWidget(widget.id);
            setWidgetMenuAnchor(null);
          }}>
            <ListItemIcon>
              <UilPlus size="20" />
            </ListItemIcon>
            <Box>
              <Typography variant="body2">{widget.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                Add to {widget.column === 'col1' ? 'Column 1' : widget.column === 'col2' ? 'Column 2' : 'Column 3'}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        {availableWidgets.filter(w => !w.enabled).length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              All widgets are enabled
            </Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Add Widget Dialog */}
      <Dialog open={addWidgetDialog} onClose={() => setAddWidgetDialog(false)}>
        <DialogTitle>Add Widgets</DialogTitle>
        <DialogContent>
          <List>
            {availableWidgets.map((widget) => (
              <ListItemButton key={widget.id} onClick={() => toggleWidget(widget.id)}>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={widget.enabled}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText primary={widget.name} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddWidgetDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Layout Settings Visual Menu */}
      <Menu
        anchorEl={layoutMenuAnchor}
        open={Boolean(layoutMenuAnchor)}
        onClose={() => setLayoutMenuAnchor(null)}
        PaperProps={{
          sx: { 
            p: 1,
            minWidth: 200
          }
        }}
      >
        <Box sx={{ px: 1, py: 0.5, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Layout Options
          </Typography>
        </Box>
        
        {/* 1 Column Full Width */}
        <MenuItem onClick={() => handleLayoutChange('1-col')} sx={{ p: 1.5, flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, width: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              opacity: columnLayout === '1-col' ? 1 : 0.6,
              transform: columnLayout === '1-col' ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease'
            }}>
              <Box sx={{ width: 48, height: 24, backgroundColor: 'primary.main', borderRadius: 0.5 }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: columnLayout === '1-col' ? 600 : 400 }}>
              Full Width
            </Typography>
            {columnLayout === '1-col' && (
              <Box sx={{ ml: 'auto', color: 'primary.main' }}>
                <Typography variant="caption">✓</Typography>
              </Box>
            )}
          </Box>
        </MenuItem>
        
        {/* 2 Columns + 1 Column */}
        <MenuItem onClick={() => handleLayoutChange('2-1-col')} sx={{ p: 1.5, flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, width: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              opacity: columnLayout === '2-1-col' ? 1 : 0.6,
              transform: columnLayout === '2-1-col' ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease'
            }}>
              <Box sx={{ width: 32, height: 24, backgroundColor: 'primary.main', borderRadius: 0.5 }} />
              <Box sx={{ width: 16, height: 24, backgroundColor: 'primary.light', borderRadius: 0.5 }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: columnLayout === '2-1-col' ? 600 : 400 }}>
              2 + 1 Columns
            </Typography>
            {columnLayout === '2-1-col' && (
              <Box sx={{ ml: 'auto', color: 'primary.main' }}>
                <Typography variant="caption">✓</Typography>
              </Box>
            )}
          </Box>
        </MenuItem>
        
        {/* 1 Column + 2 Columns */}
        <MenuItem onClick={() => handleLayoutChange('1-2-col')} sx={{ p: 1.5, flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, width: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              opacity: columnLayout === '1-2-col' ? 1 : 0.6,
              transform: columnLayout === '1-2-col' ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease'
            }}>
              <Box sx={{ width: 16, height: 24, backgroundColor: 'primary.light', borderRadius: 0.5 }} />
              <Box sx={{ width: 32, height: 24, backgroundColor: 'primary.main', borderRadius: 0.5 }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: columnLayout === '1-2-col' ? 600 : 400 }}>
              1 + 2 Columns
            </Typography>
            {columnLayout === '1-2-col' && (
              <Box sx={{ ml: 'auto', color: 'primary.main' }}>
                <Typography variant="caption">✓</Typography>
              </Box>
            )}
          </Box>
        </MenuItem>
        
        {/* 3 Equal Columns */}
        <MenuItem onClick={() => handleLayoutChange('3-col')} sx={{ p: 1.5, flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, width: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              opacity: columnLayout === '3-col' ? 1 : 0.6,
              transform: columnLayout === '3-col' ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease'
            }}>
              <Box sx={{ width: 16, height: 24, backgroundColor: 'primary.main', borderRadius: 0.5 }} />
              <Box sx={{ width: 16, height: 24, backgroundColor: 'primary.main', borderRadius: 0.5 }} />
              <Box sx={{ width: 16, height: 24, backgroundColor: 'primary.main', borderRadius: 0.5 }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: columnLayout === '3-col' ? 600 : 400 }}>
              3 Equal Columns
            </Typography>
            {columnLayout === '3-col' && (
              <Box sx={{ ml: 'auto', color: 'primary.main' }}>
                <Typography variant="caption">✓</Typography>
              </Box>
            )}
          </Box>
        </MenuItem>
      </Menu>

      {/* Create Post Modal */}
      <Dialog open={createPostDialog} onClose={() => setCreatePostDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Post</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            What type of post would you like to create?
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<UilFileEditAlt size="20" />}
              onClick={() => handleCreatePost('post')}
              sx={{ 
                justifyContent: 'flex-start', 
                textAlign: 'left',
                p: 2,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.04)
                }
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>Post</Typography>
                <Typography variant="body2" color="text.secondary">
                  Share updates, announcements, or general content
                </Typography>
              </Box>
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<UilTag size="20" />}
              onClick={() => handleCreatePost('offer')}
              sx={{ 
                justifyContent: 'flex-start', 
                textAlign: 'left',
                p: 2,
                borderColor: 'success.main',
                color: 'success.main',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.success.main, 0.04),
                  borderColor: 'success.main'
                }
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>Offer</Typography>
                <Typography variant="body2" color="text.secondary">
                  Share your skills, services, or resources
                </Typography>
              </Box>
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<UilShoppingCart size="20" />}
              onClick={() => handleCreatePost('want')}
              sx={{ 
                justifyContent: 'flex-start', 
                textAlign: 'left',
                p: 2,
                borderColor: 'warning.main',
                color: 'warning.main',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.warning.main, 0.04),
                  borderColor: 'warning.main'
                }
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>Want</Typography>
                <Typography variant="body2" color="text.secondary">
                  Request help, services, or specific items
                </Typography>
              </Box>
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePostDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={sendMessageDialog} onClose={() => setSendMessageDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Message</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="To"
              value={messageRecipient}
              onChange={(e) => setMessageRecipient(e.target.value)}
              placeholder="Enter contact or group name..."
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Message"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type your message..."
              multiline
              rows={4}
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendMessageDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSendMessage}
            variant="contained"
            startIcon={<UilMessage size="20" />}
            disabled={!messageRecipient.trim() || !messageContent.trim()}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>

      {viewMode === 'widgets' ? renderWidgetMode() : renderZenMode()}
    </Box>
  );
};

export default HomePage;