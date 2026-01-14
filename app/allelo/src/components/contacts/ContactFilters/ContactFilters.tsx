import {Box, Button, useMediaQuery, useTheme} from '@mui/material';
import type {ContactsFilters} from '@/hooks/contacts/useContacts';
import {ContactFiltersDesktop} from './ContactFiltersDesktop';
import {ContactFiltersMobile} from './ContactFiltersMobile';
import {ContactActionsMenu} from './ContactActionsMenu';

interface ContactFiltersProps {
  filters: ContactsFilters;
  onAddFilter: (key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => void;
  onClearFilters: () => void;
  showSearch?: boolean;
  showFilters?: boolean;
  inManageMode?: boolean;
  onSelectAll?: () => void;
  hasSelection?: boolean;
  contactCount?: number;
  totalCount?: number;
  onMergeContacts: () => void;
  onAutomaticDeduplication: () => void;
  onAssignRCard: () => void;
}

export const ContactFilters = ({
                                 filters,
                                 onAddFilter,
                                 onClearFilters,
                                 showSearch = true,
                                 showFilters = true,
                                 inManageMode,
                                 onSelectAll,
                                 hasSelection = false,
                                 totalCount,
                                 onMergeContacts,
                                 onAutomaticDeduplication,
                                 onAssignRCard,
                               }: ContactFiltersProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const showClearFilters = filters.relationshipFilter !== 'all' ||
    filters.naoStatusFilter !== 'all' ||
    filters.accountFilter !== 'all' ||
    filters.groupFilter !== 'all' ||
    (filters.searchQuery || "").length > 0;

  return (
    <Box sx={{px: 0, mt: 1, flexShrink: 0, position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'white'}}>
      {isMobile ? (
        <ContactFiltersMobile
          filters={filters}
          showClearFilters={showClearFilters}
          onAddFilter={onAddFilter}
          onClearFilters={onClearFilters}
          showSearch={showSearch}
          showFilters={showFilters}
          inManageMode={inManageMode}
        />
      ) : (
        <ContactFiltersDesktop
          filters={filters}
          showClearFilters={showClearFilters}
          onAddFilter={onAddFilter}
          onClearFilters={onClearFilters}
          showSearch={showSearch}
          showFilters={showFilters}
        />
      )}
      {inManageMode && <>
        {totalCount && (
          <Box sx={{
            mb: 0,
            mt: {xs: 0, md: 0},
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            flexShrink: 0,
          }}>
            {/* Select All Button - left aligned with checkboxes */}
            {onSelectAll && hasSelection ? (
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
                  width: 'auto',
                  height: "10px"
                }}
              >
                Clear Selection
              </Button>
            ) : <Box/>}

            {/* Actions */}
            <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
              {/* Contact Count - right aligned with contact box right edge */}
              {/*            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.875rem',
                textAlign: 'right'
              }}
            >
              {contactCount} of {totalCount} contacts
            </Typography>*/}
              <ContactActionsMenu
                hasSelection={hasSelection}
                onAutomaticDeduplication={onAutomaticDeduplication}
                onMergeContacts={onMergeContacts}
                onAssignRCard={onAssignRCard}
              />
            </Box>

          </Box>
        )}
      </>}
    </Box>
  );
};
