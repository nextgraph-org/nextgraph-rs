import {Box, Grid, Checkbox, Typography, Button, CircularProgress} from '@mui/material';
import {ContactCard} from '@/components/contacts/ContactCard';
import type {ContactsFilters, iconFilter} from '@/hooks/contacts/useContacts';
import type {UseContactDragDropReturn} from '@/hooks/contacts/useContactDragDrop';
import {CallMerge} from '@mui/icons-material';
import {Waypoint} from 'react-waypoint';
import {useDashboardStore} from "@/stores/dashboardStore";

interface ContactGridProps {
  contactNuris: string[];
  isLoading: boolean;
  error: Error | null;
  isSelectionMode: boolean;
  isMultiSelectMode: boolean;
  filters: ContactsFilters;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onContactClick: (contactId: string) => void;
  onSelectContact: (contact: string) => void;
  onSetIconFilter: (key: iconFilter, value: string) => void;
  isContactSelected: (nuri: string) => boolean;
  onSelectAll?: () => void;
  hasSelection?: boolean;
  contactCount?: number;
  totalCount?: number;
  dragDrop?: UseContactDragDropReturn;
  onMergeContacts: () => void;
}

export const ContactGrid = ({
                              contactNuris,
                              isLoading,
                              error,
                              isSelectionMode,
                              isMultiSelectMode,
                              filters,
                              onLoadMore,
                              hasMore,
                              isLoadingMore,
                              onContactClick,
                              onSelectContact,
                              onSetIconFilter,
                              isContactSelected,
                              onSelectAll,
                              hasSelection = false,
                              contactCount,
                              totalCount,
                              dragDrop,
                              onMergeContacts
                            }: ContactGridProps) => {
  const {mainRef} = useDashboardStore();
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
      overflow: 'hidden'
    }}>
      {/* Select All Button, Contact Count and Merge Contacts - same line */}
      {totalCount && (
        <Box sx={{
          mb: 1,
          mt: {xs: 1, md: 0},
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          flexShrink: 0
        }}>
          {/* Select All Button - left aligned with checkboxes */}
          {onSelectAll && (
            <Button
              variant="text"
              onClick={onSelectAll}
              size="small"
              sx={{
                fontSize: '0.75rem',
                textTransform: 'none',
                color: 'primary.main',
                fontWeight: 500,
                minWidth: 'auto',
                p: 0.5,
                ml: 0.5, // Align with checkbox position
                width: 'auto'
              }}
            >
              {hasSelection ? 'Deselect All' : 'Select All'}
            </Button>
          )}

          {/* Actions */}
          <Box sx={{display: 'flex', alignItems: 'center', gap: 2, ml: 'auto'}}>
            {/* Contact Count - right aligned with contact box right edge */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.875rem',
                textAlign: 'right'
              }}
            >
              {contactCount} of {totalCount} contacts
            </Typography>
            {!isSelectionMode && (
              <Button
                variant="text"
                startIcon={<CallMerge/>}
                onClick={onMergeContacts}
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  color: 'primary.main',
                  fontWeight: 500,
                  minWidth: 'auto',
                  p: 0.5,
                  ml: 0.5,
                  width: 'auto'
                }}
              >
                Merge Contacts
              </Button>
            )}
          </Box>

        </Box>
      )}
      {/* Top line for scrolling under */}
      <Box sx={{
        width: '100%',
        height: '1px',
        backgroundColor: 'divider',
        mb: 0,
        opacity: 0.3
      }} />
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
                <Checkbox
                  checked={isContactSelected(nuri)}
                  onChange={() => onSelectContact(nuri)}
                  sx={{
                    mt: 0.5,
                    p: 0.5,
                    '& .MuiSvgIcon-root': {fontSize: 20}
                  }}
                />

                <ContactCard
                  nuri={nuri}
                  isSelectionMode={isSelectionMode}
                  isMultiSelectMode={isMultiSelectMode}
                  isSelected={isContactSelected(nuri)}
                  onContactClick={onContactClick}
                  onSelectContact={onSelectContact}
                  dragDrop={dragDrop}
                  onSetIconFilter={onSetIconFilter}
                />
              </Box>
            </Grid>
          ))}

          {/* Infinite scroll waypoint */}
          {hasMore && !isLoading && !isLoadingMore && (
            <Waypoint onEnter={onLoadMore} scrollableAncestor={mainRef?.current}/>
          )}

          {/* Load more spinner */}
          {isLoadingMore && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 4
              }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
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