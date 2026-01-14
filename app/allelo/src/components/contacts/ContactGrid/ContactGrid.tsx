import {Box, Grid, Checkbox, Typography, CircularProgress} from '@mui/material';
import {ContactCard} from '@/components/contacts/ContactCard';
import type {ContactsFilters, iconFilter} from '@/hooks/contacts/useContacts';
import {Waypoint} from 'react-waypoint';

interface ContactGridProps {
  contactNuris: string[];
  isLoading: boolean;
  error: Error | null;
  filters: ContactsFilters;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onContactClick: (contactId: string) => void;
  onSelectContact: (contact: string) => void;
  onSetIconFilter: (key: iconFilter, value: string) => void;
  isContactSelected: (nuri: string) => boolean;
  selectedContacts: string[];
  inManageMode: boolean;
}

export const ContactGrid = ({
                              contactNuris,
                              isLoading,
                              error,
                              filters,
                              onLoadMore,
                              hasMore,
                              isLoadingMore,
                              onContactClick,
                              onSelectContact,
                              onSetIconFilter,
                              isContactSelected,
                              inManageMode
                            }: ContactGridProps) => {
  if (error) {
    return (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="error" gutterBottom>
          Error loading contacts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error.message}
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Loading contacts...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we fetch your contacts
        </Typography>
      </Box>
    );
  }

  if (contactNuris.length === 0) {
    return (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {(filters.searchQuery || '') ? 'No contacts found' : 'No contacts yet'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {(filters.searchQuery || '') ? 'Try adjusting your search terms.' : 'Import some contacts to get started!'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top line for scrolling under */}
      <Box sx={{
        width: '100%',
        height: '1px',
        backgroundColor: 'divider',
        mb: 0,
        opacity: 0.3
      }}/>
      {/* Scrollable content area */}
      <Box sx={{
        py: 1,
        pr: 1,
        flex: 1,
        minWidth: 0,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px'
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.3)'
          }
        }
      }}>
        <Grid container spacing={1}>
          {contactNuris.map((nuri) => (
            <Grid size={{xs: 12}} key={nuri}>
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                {/* Selection checkbox - always visible on the left */}
                {inManageMode && <Checkbox
                  checked={isContactSelected(nuri)}
                  onChange={() => onSelectContact(nuri)}
                  sx={{
                    mt: 0.5,
                    p: 0.5,
                    '& .MuiSvgIcon-root': {fontSize: 20}
                  }}
                />}

                <ContactCard
                  nuri={nuri}
                  onContactClick={onContactClick}
                  onSetIconFilter={onSetIconFilter}
                  inManageMode={inManageMode}
                />
              </Box>
            </Grid>
          ))}

          {/* Infinite scroll waypoint */}
          {hasMore && !isLoading && !isLoadingMore && (
            <Waypoint onEnter={onLoadMore}/>
          )}

          {/* Load more spinner */}
          {isLoadingMore && (
            <Grid size={{xs: 12}}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 4
              }}>
                <CircularProgress size={24}/>
                <Typography variant="body2" color="text.secondary" sx={{ml: 2}}>
                  Loading more contacts...
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};
