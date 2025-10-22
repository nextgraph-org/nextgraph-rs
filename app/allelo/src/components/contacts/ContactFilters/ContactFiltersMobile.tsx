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
  Search,
  FilterList,
  Sort
} from '@mui/icons-material';
import type {ContactsFilters} from '@/hooks/contacts/useContacts';
import type {UseContactDragDropReturn} from '@/hooks/contacts/useContactDragDrop';
import {CategorySidebar} from '../CategorySidebar';
import {useRelationshipCategories} from '@/hooks/useRelationshipCategories';
import {SortMenu} from './SortMenu';
import {SearchFilter} from './SearchFilter';

interface MobileFiltersProps {
  filters: ContactsFilters;
  onAddFilter: (key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => void;
  onClearFilters: () => void;
  dragDrop?: UseContactDragDropReturn;
  showClearFilters?: boolean;
  showSearch: boolean;
  showFilters: boolean;
}

export const ContactFiltersMobile = ({
                                       filters,
                                       onAddFilter,
                                       onClearFilters,
                                       dragDrop,
                                       showClearFilters,
                                       showSearch,
                                       showFilters
                                     }: MobileFiltersProps) => {
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const {getMenuItems} = useRelationshipCategories();

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleClearFilters = () => {
    onClearFilters();
    setShowMobileSearch(false);
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
      {/* Category Sidebar and Mobile Search/Filter Icons */}
      <Box sx={{
        display: 'flex',
        gap: 1,
        mb: 1,
        justifyContent: 'space-between',
        minHeight: 'auto',
        py: 0
      }}>
        {/* Category Sidebar */}
        {showFilters && <Box sx={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
          <CategorySidebar
            filters={filters}
            dragDrop={dragDrop}
            onAddFilter={onAddFilter}
          />
        </Box>}

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
        <div></div>

        {/* Mobile Search and Filter Icons */}
        {showSearch && <Box sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
        }}>
          {showMobileSearch ? (
            <SearchFilter
              value={filters.searchQuery || ''}
              onSearchChange={(value) => onAddFilter('searchQuery', value)}
              placeholder="Search..."
              debounceMs={0}
              autoFocus
              onBlur={() => {
                if (!filters.searchQuery) {
                  setShowMobileSearch(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onAddFilter('searchQuery', '');
                  setShowMobileSearch(false);
                }
              }}
              sx={{
                flex: 1,
                mb: 0,
                '& .MuiOutlinedInput-root': {
                  height: 32
                }
              }}
            />
          ) : (
            <Button
              onClick={() => setShowMobileSearch(true)}
              sx={{
                minWidth: 32,
                width: 32,
                height: 32,
                p: 0,
                border: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  border: 'none'
                }
              }}
            >
              <Search sx={{fontSize: 20}}/>
            </Button>
          )}
          {showFilters && <Button
            onClick={handleFilterClick}
            sx={{
              minWidth: 32,
              width: 32,
              height: 32,
              p: 0,
              border: 'none',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                border: 'none'
              }
            }}
          >
            <FilterList sx={{fontSize: 20}}/>
          </Button>}

          {/* Sort Button */}
          <Button
            onClick={handleSortClick}
            size="small"
            sx={{
              minWidth: 32,
              width: 32,
              height: 32,
              p: 0,
              border: 'none',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                border: 'none'
              }
            }}
          >
            <Sort sx={{fontSize: 20}}/>
          </Button>
        </Box>}
      </Box>

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