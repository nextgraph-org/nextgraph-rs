import {
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  InputBase,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton, ListItemText,
  Paper, Typography
} from "@mui/material";
import {forwardRef, useState} from "react";
import {ConversationListProps} from "./types";
import {Group, Search} from "@mui/icons-material";

export const ConversationList = forwardRef<HTMLDivElement, ConversationListProps>(
  ({conversations, selectConversation, selectedConversation}, ref) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>('all');

    const formatTime = (date: Date) => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return date.toLocaleDateString();
    };

    const filteredConversations = conversations.filter(conv => {
      // First apply search filter
      const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Then apply active filter
      switch (activeFilter) {
        case 'unread':
          return conv.unreadCount > 0;
        case 'groups':
          return conv.isGroup;
        case 'all':
        default:
          return true;
      }
    });

    return <Paper ref={ref} sx={{
      width: {xs: '100%', md: '360px'},
      display: {
        xs: selectedConversation ? 'none' : 'flex',
        md: 'flex'
      },
      flexDirection: 'column',
      borderRadius: {xs: 0, md: '12px 12px 0 0'},
      overflow: 'hidden'
    }}>
      {/* Search Bar */}
      <Box sx={{p: 2}}>
        <Paper sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          backgroundColor: 'background.default',
          border: 1,
          borderColor: 'divider'
        }}>
          <Search sx={{color: 'text.secondary', mr: 1}}/>
          <InputBase
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{flex: 1}}
          />
        </Paper>
      </Box>

      {/* Filter Chips */}
      <Box sx={{px: 2, pb: 1}}>
        <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
          <Chip
            label="All"
            size="small"
            variant={activeFilter === 'all' ? 'filled' : 'outlined'}
            clickable
            onClick={() => setActiveFilter('all')}
            sx={{
              backgroundColor: activeFilter === 'all' ? 'primary.main' : 'transparent',
              color: activeFilter === 'all' ? 'white' : 'text.primary',
              '&:hover': {
                backgroundColor: activeFilter === 'all' ? 'primary.dark' : 'action.hover'
              }
            }}
          />
          <Chip
            label={`Unread${activeFilter === 'unread' ? ` (${conversations.filter(c => c.unreadCount > 0).length})` : ''}`}
            size="small"
            variant={activeFilter === 'unread' ? 'filled' : 'outlined'}
            clickable
            onClick={() => setActiveFilter('unread')}
            sx={{
              backgroundColor: activeFilter === 'unread' ? 'primary.main' : 'transparent',
              color: activeFilter === 'unread' ? 'white' : 'text.primary',
              '&:hover': {
                backgroundColor: activeFilter === 'unread' ? 'primary.dark' : 'action.hover'
              }
            }}
          />
          <Chip
            label={`Groups${activeFilter === 'groups' ? ` (${conversations.filter(c => c.isGroup).length})` : ''}`}
            size="small"
            variant={activeFilter === 'groups' ? 'filled' : 'outlined'}
            clickable
            onClick={() => setActiveFilter('groups')}
            sx={{
              backgroundColor: activeFilter === 'groups' ? 'primary.main' : 'transparent',
              color: activeFilter === 'groups' ? 'white' : 'text.primary',
              '&:hover': {
                backgroundColor: activeFilter === 'groups' ? 'primary.dark' : 'action.hover'
              }
            }}
          />
        </Box>
      </Box>

      <Divider/>

      {/* Conversations */}
      <List sx={{flex: 1, overflow: 'auto', py: 0}}>
        {filteredConversations.map((conversation) => (
          <ListItem key={conversation.id} disablePadding>
            <ListItemButton
              selected={selectedConversation === conversation.id}
              onClick={() => selectConversation(conversation.id)}
              sx={{
                py: 2,
                px: 2,
                '&.Mui-selected': {
                  backgroundColor: 'background.paper'
                }
              }}
            >
              <ListItemAvatar>
                <Badge
                  variant="dot"
                  color="success"
                  invisible={!conversation.isOnline}
                  sx={{
                    '& .MuiBadge-dot': {
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      border: '2px solid white'
                    }
                  }}
                >
                  <Avatar
                    src={conversation.avatar}
                    sx={{
                      width: 48,
                      height: 48,
                      backgroundColor: conversation.isGroup ? 'primary.main' : 'secondary.main',
                      backgroundImage: conversation.avatar ? `url(${conversation.avatar})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!conversation.avatar && (conversation.isGroup ? <Group/> : conversation.name.charAt(0))}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                slotProps={{
                  primary: { component: 'div' },
                  secondary: { component: 'div' }
                }}
                primary={
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <Typography variant="subtitle1" sx={{fontWeight: 600}}>
                      {conversation.name}
                    </Typography>
                    {conversation.isGroup && (
                      <Group sx={{fontSize: 16, color: 'text.secondary'}}/>
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mb: 0.5
                      }}
                    >
                      {conversation.lastMessage}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {conversation.lastActivity}
                    </Typography>
                  </Box>
                }
              />
              <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1}}>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(conversation.lastMessageTime)}
                </Typography>
                {conversation.unreadCount > 0 && (
                  <Badge
                    badgeContent={conversation.unreadCount}
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.7rem',
                        height: 18,
                        minWidth: 18
                      }
                    }}
                  />
                )}
              </Box>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>

  }
);