import {forwardRef} from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  UilUsersAlt as People
} from '@iconscout/react-unicons';
import {GroupItem} from "@/components/groups/GroupItem/GroupItem.tsx";
import {GroupItemDesktop} from "@/components/groups/GroupItem/GroupItemDesktop.tsx";

export interface GroupFeedProps {
  groupsNuris: string[];
  isLoading: boolean;
  searchQuery: string | undefined;
  onGroupClick: (groupId: string) => void;
}

export const GroupFeed = forwardRef<HTMLDivElement, GroupFeedProps>(
  ({groupsNuris, isLoading, searchQuery, onGroupClick}, ref) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const renderMobileView = () => (
      <Box sx={{
        display: {xs: 'block', md: 'none'},
        mb: 3,
        width: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {isLoading ? (
          <Box sx={{textAlign: 'center', py: 8}}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Loading groups...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we fetch your groups
            </Typography>
          </Box>
        ) : groupsNuris.length === 0 ? (
          <Box sx={{textAlign: 'center', py: 8}}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchQuery ? 'No groups found' : 'No groups yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'Try adjusting your search terms.' : 'Create your first group to get started!'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
            {groupsNuris.map((groupNuri) => (<GroupItem nuri={groupNuri} onGroupClick={onGroupClick}/>
            ))}
          </Box>
        )}
      </Box>
    );

    const renderDesktopView = () => (
      <Box sx={{
        py: 1,
        display: {xs: 'none', md: 'block'},
        mb: 3,
        width: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {isLoading ? (
          <Box sx={{textAlign: 'center', py: 8}}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Loading groups...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we fetch your groups
            </Typography>
          </Box>
        ) : groupsNuris.length === 0 ? (
          <Box sx={{textAlign: 'center', py: 8}}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchQuery ? 'No groups found' : 'No groups yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'Try adjusting your search terms.' : 'Create your first group to get started!'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {groupsNuris.map((groupNuri) => (<GroupItemDesktop nuri={groupNuri} onGroupClick={onGroupClick}/>))}
          </Grid>
        )}
      </Box>
    );

    return (
      <Box ref={ref}>
        {isMobile ? renderMobileView() : renderDesktopView()}
      </Box>
    );
  }
);

GroupFeed.displayName = 'GroupFeed';