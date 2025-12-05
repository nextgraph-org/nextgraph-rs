import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
} from '@mui/material';
import {
  UilPlus as Add,
} from '@iconscout/react-unicons';
import { GroupFeed } from '@/components/groups/GroupPage/GroupFeed/GroupFeed';
import {useGroups} from "@/hooks/groups/useGroups.ts";
import {useCallback} from "react";
import {SearchFilter} from "@/components/contacts/ContactFilters";

export const GroupListPage = () => {
  const {
    isLoading,
    groupsNuris,
    addFilter,
    filters
  } = useGroups({limit: 10});

  const navigate = useNavigate();

  const searchQuery = filters.searchQuery;
  const setSearchQuery = useCallback((value: string) => addFilter("searchQuery", value), [addFilter]);

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

      <Box sx={{
        mb: 2,
        width: '100%', 
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <SearchFilter placeholder={"Search groups..."} value={searchQuery ?? ""} onSearchChange={(res) => setSearchQuery(res)}/>
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