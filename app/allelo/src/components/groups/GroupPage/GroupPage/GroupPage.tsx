import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import {
  UilSearch as Search,
  UilPlus as Add,
} from '@iconscout/react-unicons';
import { dataService } from '@/services/dataService';
import type { Group as GroupType } from '@/types/group';
import { GroupFeed } from '../GroupFeed';

export const GroupPage = () => {
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<GroupType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadGroups = async () => {
      setIsLoading(true);
      try {
        const groupsData = await dataService.getGroups();
        setGroups(groupsData);
        setFilteredGroups(groupsData);
      } catch (error) {
        console.error('Failed to load groups:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGroups();
  }, []);

  useEffect(() => {
    const filtered = groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredGroups(filtered);
  }, [searchQuery, groups]);

  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  const handleCreateGroup = () => {
    navigate('/groups/create');
  };

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: { xs: '100vw', md: '100%' },
      overflow: 'hidden',
      boxSizing: 'border-box',
      p: { xs: '10px', md: 0 },
      mx: { xs: 0, md: 'auto' }
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: { xs: 1, md: 1 },
        width: '100%',
        overflow: 'hidden',
        minWidth: 0
      }}>
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              mb: { xs: 0, md: 0 },
              fontSize: { xs: '1.5rem', md: '2.125rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            Groups
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateGroup}
          sx={{
            borderRadius: 2,
            fontSize: { xs: '0.7rem', md: '0.875rem' },
            px: { xs: 0.75, md: 2 },
            py: { xs: 0.5, md: 0.75 }
          }}
        >
          Create group
        </Button>
      </Box>

      {/* Mobile Search */}
      <Box sx={{ 
        display: { xs: 'block', md: 'none' },
        mb: 2,
        width: '100%', 
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <TextField
          fullWidth
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          size="small"
          sx={{ 
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
        />
      </Box>

      {/* Desktop Search */}
      <Box sx={{ 
        display: { xs: 'none', md: 'block' },
        mb: 3,
        width: '100%', 
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <TextField
          fullWidth
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Group Feed */}
      <GroupFeed
        groups={filteredGroups}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onGroupClick={handleGroupClick}
      />
    </Box>
  );
};