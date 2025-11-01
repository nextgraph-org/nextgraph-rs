import { forwardRef } from 'react';
import { 
  Typography, 
  Box, 
  Avatar, 
  IconButton, 
  Button, 
  Chip, 
  alpha, 
  useTheme 
} from '@mui/material';
import {
  UilArrowLeft as ArrowBack,
  UilStarHalfAlt as AutoAwesome,
  UilInfoCircle as Info,
  UilUserPlus as PersonAdd
} from '@iconscout/react-unicons';
import type { GroupHeaderProps } from './types';

export const GroupHeader = forwardRef<HTMLDivElement, GroupHeaderProps>(
  ({ group, isLoading, onBack, onInvite, onStartAIAssistant, onStartTour }, ref) => {
    const theme = useTheme();

    if (isLoading) {
      return (
        <Box 
          ref={ref}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 3,
            px: { xs: 2, sm: 0 }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={onBack} sx={{ mr: 1 }}>
              <ArrowBack size="20" />
            </IconButton>
            <Box sx={{ width: 50, height: 50, bgcolor: 'grey.200', borderRadius: '50%' }} />
            <Box>
              <Box sx={{ width: 200, height: 24, bgcolor: 'grey.200', borderRadius: 1 }} />
              <Box sx={{ width: 150, height: 16, bgcolor: 'grey.200', borderRadius: 1, mt: 0.5 }} />
            </Box>
          </Box>
        </Box>
      );
    }

    if (!group) {
      return (
        <Box 
          ref={ref}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 3,
            px: { xs: 2, sm: 0 }
          }}
        >
          <IconButton onClick={onBack} sx={{ mr: 2 }}>
            <ArrowBack size="20" />
          </IconButton>
          <Typography variant="h6" color="text.secondary">
            Group not found
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        ref={ref}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          mb: 3,
          gap: 2,
          px: { xs: 2, sm: 0 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <IconButton
            onClick={onBack}
            sx={{
              mr: 1,
              display: { xs: 'flex', sm: 'flex' }
            }}
          >
            <ArrowBack size="20" />
          </IconButton>
          
          <Avatar
            src={(group as { photo?: string }).photo}
            sx={{
              width: { xs: 50, md: 64 },
              height: { xs: 50, md: 64 },
              fontSize: { xs: '1.2rem', md: '1.5rem' }
            }}
          >
            {group.name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '1.5rem', md: '2rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {group.name}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                {group.memberCount} members
              </Typography>
              
              {(group as { category?: string }).category && (
                <Chip
                  label={(group as { category?: string }).category}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              
              {group.isPrivate && (
                <Chip
                  label="Private"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
        </Box>

        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1, 
            flexShrink: 0,
            width: { xs: '100%', md: 'auto' },
            justifyContent: { xs: 'stretch', md: 'flex-end' }
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Info size="20" />}
            onClick={onStartTour}
            sx={{ 
              borderRadius: 2,
              flex: { xs: 1, md: 'none' }
            }}
          >
            Tour
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<AutoAwesome size="20" />}
            onClick={() => onStartAIAssistant()}
            sx={{
              borderRadius: 2,
              background: alpha(theme.palette.primary.main, 0.05),
              borderColor: alpha(theme.palette.primary.main, 0.3),
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.1),
                borderColor: theme.palette.primary.main,
              },
              flex: { xs: 1, md: 'none' }
            }}
          >
            AI Assistant
          </Button>
          
          <Button
            variant="contained"
            startIcon={<PersonAdd size="20" />}
            onClick={onInvite}
            sx={{ 
              borderRadius: 2,
              flex: { xs: 1, md: 'none' }
            }}
          >
            Invite
          </Button>
        </Box>
      </Box>
    );
  }
);

GroupHeader.displayName = 'GroupHeader';