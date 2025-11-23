import {useState} from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu
} from '@mui/material';
import {
  UilFilter,
  UilSortAmountDown
} from '@iconscout/react-unicons';
import type {ContactsFilters} from '@/hooks/contacts/useContacts';
import {SortMenu} from './SortMenu';
import {SearchFilter} from './SearchFilter';
import {RCardsMobileWidget} from "@/components/rcards/RCardsSideWidget";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";

interface MobileFiltersProps {
  filters: ContactsFilters;
  onAddFilter: (key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => void;
  onClearFilters: () => void;
  showClearFilters?: boolean;
  showSearch: boolean;
  showFilters: boolean;
  inManageMode?: boolean;
}

export const ContactFiltersMobile = ({
                                       filters,
                                       onAddFilter,
                                       onClearFilters,
                                       showClearFilters,
                                       showSearch,
                                       showFilters,
                                       inManageMode = false
                                     }: MobileFiltersProps) => {
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const {getMenuItems} = useGetRCards();

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleClearFilters = () => {
    onClearFilters();
  };

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

  return (
    <>
      {/* Category Sidebar */}
      {inManageMode && <Box sx={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
        <RCardsMobileWidget
          filters={filters}
          onAddFilter={onAddFilter}
        />
      </Box>}

      {!inManageMode && <Box sx={{
        display: 'flex',
        gap: 1,
        mb: 1,
        width: '100%',
        minHeight: 'auto',
        py: 0
      }}>
        {showSearch && <SearchFilter
          value={filters.searchQuery || ''}
          onSearchChange={(value) => onAddFilter('searchQuery', value)}
          placeholder="Search..."
          sx={{
            flex: 1,
            mb: 0,
            '& .MuiOutlinedInput-root': {
              height: 44
            }
          }}
        />}
        {showFilters && <Button
          onClick={handleFilterClick}
          sx={{
            minWidth: 44,
            width: 44,
            height: 44,
            p: 0,
            border: 'none',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              border: 'none'
            }
          }}
        >
          <UilFilter size="24"/>
        </Button>}

        {/* Sort Button */}
        <Button
          onClick={handleSortClick}
          size="small"
          sx={{
            minWidth: 44,
            width: 44,
            height: 44,
            p: 0,
            border: 'none',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              border: 'none'
            }
          }}
        >
          <UilSortAmountDown size="24"/>
        </Button>
        {showClearFilters && (
          <Button
            sx={{
              width: '40px',
              fontSize: '11px',
              padding: 0
            }}
            variant="text"
            onClick={onClearFilters}
            size="small"
            color="secondary"

          >
            Clear Filters
          </Button>
        )}
      </Box>}

      {/* Mobile Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterClose}
        PaperProps={{sx: {minWidth: 200}}}
      >
        <Box sx={{p: 2}}>
          <FormControl fullWidth size="small" sx={{mb: 2}}>
            <InputLabel>Relationship</InputLabel>
            <Select
              value={filters.relationshipFilter || 'all'}
              label="Relationship"
              onChange={(e) => {
                onAddFilter('relationshipFilter', e.target.value);
                handleFilterClose();
              }}
            >
              {getMenuItems().map(item => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{mb: 2}}>
            <InputLabel>Groups</InputLabel>
            <Select
              value={filters.groupFilter || 'all'}
              label="Groups"
              onChange={(e) => {
                onAddFilter('groupFilter', e.target.value);
                handleFilterClose();
              }}
            >
              <MenuItem value="all">All Groups</MenuItem>
              <MenuItem value="has_groups">In Groups</MenuItem>
              <MenuItem value="no_groups">No Groups</MenuItem>
              <MenuItem value="groups_in_common">Groups in Common</MenuItem>
            </Select>
          </FormControl>

          {showClearFilters && (
            <Button
              variant="text"
              onClick={handleClearFilters}
              size="small"
              color="secondary"
              fullWidth
            >
              Clear Filters
            </Button>
          )}
        </Box>
      </Menu>
      <SortMenu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={handleSortClose}
        onSortChange={handleSortChange}
      />
    </>
  );
};
