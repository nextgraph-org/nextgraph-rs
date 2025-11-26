import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  UilSortAmountDown
} from '@iconscout/react-unicons';
import {useState, useCallback} from 'react';
import type {ContactsFilters} from '@/hooks/contacts/useContacts';
import {SortMenu} from './SortMenu';
import {SearchFilter} from './SearchFilter';
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";

interface DesktopFiltersProps {
  filters: ContactsFilters;
  onAddFilter: (key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => void;
  onClearFilters: () => void;
  showClearFilters?: boolean;
  showSearch: boolean;
  showFilters: boolean;
}

export const ContactFiltersDesktop = ({
                                        filters,
                                        onAddFilter,
                                        onClearFilters,
                                        showClearFilters,
                                        showSearch,
                                        showFilters,
                                      }: DesktopFiltersProps) => {
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const {getMenuItems} = useGetRCards();

  const handleSearchChange = useCallback((value: string) => {
    onAddFilter('searchQuery', value);
  }, [onAddFilter]);

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortMenuAnchor(null);
  };

  const handleSortChange = (newSortBy: string) => {
    const currentSortBy = filters.sortBy || 'name';
    const currentSortDirection = filters.sortDirection || 'asc';

    if (currentSortBy === newSortBy) {
      onAddFilter('sortDirection', currentSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onAddFilter('sortBy', newSortBy);
      onAddFilter('sortDirection', 'asc');
    }
    handleSortClose();
  };

  const getSortDisplayText = () => {
    return 'Sort by';
  };

  return (
    <Box sx={{display: 'flex', flexDirection: 'row', gap: 2,}}>
      {showSearch && <SearchFilter
        value={filters.searchQuery || ''}
        onSearchChange={handleSearchChange}
      />}

      {/* Desktop Filter and Sort Controls */}
      {showFilters && <Box sx={{
        display: 'flex',
        gap: 2,
        mb: 3,
        alignItems: 'center',
      }}>
        {/* Relationship Filter */}
        <FormControl size="small" sx={{minWidth: 140}}>
          <InputLabel>Relationship</InputLabel>
          <Select
            value={filters.relationshipFilter || 'all'}
            label="Relationship"
            onChange={(e) => onAddFilter('relationshipFilter', e.target.value)}
          >
            {getMenuItems().map(item => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Group Filter */}
        <FormControl size="small" sx={{minWidth: 120}}>
          <InputLabel>Groups</InputLabel>
          <Select
            value={filters.groupFilter || 'all'}
            label="Groups"
            onChange={(e) => onAddFilter('groupFilter', e.target.value)}
          >
            <MenuItem value="all">All Groups</MenuItem>
            <MenuItem value="has_groups">In Groups</MenuItem>
            <MenuItem value="no_groups">No Groups</MenuItem>
            <MenuItem value="groups_in_common">Groups in Common</MenuItem>
          </Select>
        </FormControl>

        {/* Sort Button */}
        <Button
          startIcon={<UilSortAmountDown size="18"/>}
          onClick={handleSortClick}
          size="small"
          sx={{
            height: 40,
            minWidth: 120,
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.23)',
            borderRadius: 1,
            color: 'text.primary',
            textDecoration: 'none',
            '&:hover': {
              borderColor: 'rgba(0, 0, 0, 0.87)',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              textDecoration: 'none'
            }
          }}
        >
          {getSortDisplayText()}
        </Button>

        {/* Clear Filters */}
        {showClearFilters && (
          <Button
            variant="text"
            onClick={onClearFilters}
            size="small"
            color="secondary"
          >
            Clear Filters
          </Button>
        )}
      </Box>}

      {/* Desktop Sort Menu */}
      <SortMenu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={handleSortClose}
        onSortChange={handleSortChange}
      />
    </Box>
  );
};