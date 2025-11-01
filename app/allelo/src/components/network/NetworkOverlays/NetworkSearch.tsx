import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Paper,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { UilTimes as Close, UilSearch as Search } from '@iconscout/react-unicons';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';
import { useNetworkViewStore } from '@/stores/networkViewStore';

export const NetworkSearch = () => {
  const { isSearchOpen, setSearchOpen } = useNetworkViewStore();
  const { nodes, centerNode } = useNetworkGraphStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return nodes
      .filter(
        (node) =>
          node.name.toLowerCase().includes(query) ||
          node.initials.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [nodes, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  if (!isSearchOpen) return null;

  const handleSelectNode = (nodeId: string) => {
    centerNode(nodeId);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 8,
      }}
      onClick={handleClose}
    >
      <Paper
        onClick={(e) => e.stopPropagation()}
        sx={{
          width: { xs: '90%', sm: 500 },
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TextField
          autoFocus
          fullWidth
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size="20" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClose}>
                  <Close size="20" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ m: 2, mb: 0 }}
        />

        <List sx={{ overflow: 'auto', flex: 1 }}>
          {filteredNodes.map((node) => (
            <ListItem
              key={node.id}
              component="div"
              sx={{ cursor: 'pointer' }}
              onClick={() => handleSelectNode(node.id)}
            >
              <ListItemAvatar>
                <Avatar src={node.avatar} alt={node.name}>
                  {node.initials}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={node.name} secondary={node.type} />
            </ListItem>
          ))}
          {searchQuery && filteredNodes.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No results found"
                sx={{ textAlign: 'center', color: 'text.secondary' }}
              />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
};
