import { forwardRef } from 'react';
import {
  Typography,
  Box,
  Avatar,
  Card,
  CardContent,
  Grid,
  Chip,
  Badge,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Group,
  People
} from '@mui/icons-material';
import type { Group as GroupType } from '@/types/group';

export interface GroupFeedProps {
  groups: GroupType[];
  isLoading: boolean;
  searchQuery: string;
  onGroupClick: (groupId: string) => void;
}

export const GroupFeed = forwardRef<HTMLDivElement, GroupFeedProps>(
  ({ groups, isLoading, searchQuery, onGroupClick }, ref) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const renderMobileView = () => (
      <Box sx={{ 
        display: { xs: 'block', md: 'none' },
        mb: 3,
        width: '100%', 
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Loading groups...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we fetch your groups
            </Typography>
          </Box>
        ) : groups.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchQuery ? 'No groups found' : 'No groups yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'Try adjusting your search terms.' : 'Create your first group to get started!'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {groups.map((group) => (
              <Box
                key={group.id}
                onClick={() => onGroupClick(group.id)}
                sx={{
                  cursor: 'pointer',
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={group.image}
                    alt={group.name}
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      bgcolor: 'white',
                      border: 1,
                      borderColor: 'primary.main',
                      color: 'primary.main'
                    }}
                  >
                    <Group />
                  </Avatar>
                  
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography 
                        variant="subtitle1" 
                        component="div" 
                        sx={{ 
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {group.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <People sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {group.memberCount}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      {group.unreadCount && group.unreadCount > 0 && (
                        <Badge 
                          badgeContent={group.unreadCount} 
                          color="primary"
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.65rem',
                              height: 16,
                              minWidth: 16,
                              borderRadius: '8px'
                            }
                          }}
                        >
                          <Box sx={{ width: 8, height: 8 }} />
                        </Badge>
                      )}
                    </Box>
                  </Box>
                </Box>
                
                {group.latestPost && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      fontWeight: 600,
                      mt: 1
                    }}
                  >
                    {group.latestPostAuthor && `${group.latestPostAuthor.split(' ')[0]}: `}{group.latestPost}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );

    const renderDesktopView = () => (
      <Box sx={{
        py: 1,
        display: { xs: 'none', md: 'block' },
        mb: 3,
        width: '100%', 
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Loading groups...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we fetch your groups
            </Typography>
          </Box>
        ) : groups.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchQuery ? 'No groups found' : 'No groups yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'Try adjusting your search terms.' : 'Create your first group to get started!'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {groups.map((group) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={group.id}>
                <Card
                  onClick={() => onGroupClick(group.id)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    border: 1,
                    borderColor: 'divider',
                    height: '100%',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: theme.shadows[4],
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar
                        src={group.image}
                        alt={group.name}
                        sx={{ 
                          width: 48, 
                          height: 48, 
                          bgcolor: 'white',
                          border: 1,
                          borderColor: 'primary.main',
                          color: 'primary.main'
                        }}
                      >
                        <Group />
                      </Avatar>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                              {group.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                              <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {group.memberCount}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {group.unreadCount && group.unreadCount > 0 && (
                            <Badge 
                              badgeContent={group.unreadCount} 
                              color="primary"
                              sx={{
                                '& .MuiBadge-badge': {
                                  fontSize: '0.65rem',
                                  height: 16,
                                  minWidth: 16,
                                  borderRadius: '8px'
                                }
                              }}
                            >
                              <Box sx={{ width: 8, height: 8 }} />
                            </Badge>
                          )}
                        </Box>
                      </Box>
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2, 
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {group.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {group.tags?.slice(0, 3).map((tag) => (
                        <Chip 
                          key={tag} 
                          label={tag} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            borderRadius: 1,
                            backgroundColor: alpha(theme.palette.primary.main, 0.04),
                            borderColor: alpha(theme.palette.primary.main, 0.12),
                            color: 'primary.main',
                            fontWeight: 500,
                          }}
                        />
                      ))}
                    </Box>
                    
                    {group.latestPost && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                          Latest post:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            fontStyle: 'italic',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          {group.latestPostAuthor && `${group.latestPostAuthor.split(' ')[0]}: `}{group.latestPost}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
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