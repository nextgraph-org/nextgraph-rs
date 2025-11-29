import { useState } from 'react';
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
import { GroupFeed } from '@/components/groups/GroupPage/GroupFeed/GroupFeed';
import {useGroups} from "@/hooks/groups/useGroups.ts";

export const GroupPage = () => {
  const {
    isLoading,
    addFilter,
    clearFilters,
    filters,
    hasMore,
    loadMore,
    totalCount,
    groupsNuris
  } = useGroups({limit: 10});
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
        groupsNuris={groupsNuris}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onGroupClick={handleGroupClick}
      />
    </Box>
  );
};