import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Typography,
  Chip,
  Stack
} from '@mui/material';
import {
  UilFilter as FilterList,
  UilSort as Sort,
  UilTimes as Clear,
  UilAngleDown as KeyboardArrowDown
} from '@iconscout/react-unicons';
import { SearchInput } from '../SearchInput';
import type { FilterControlsProps } from './types';

export const FilterControls = ({
  searchValue = '',
  onSearchChange,
  sortOptions = [],
  currentSort,
  sortDirection = 'asc',
  onSortChange,
  filterOptions = [],
  activeFilters = [],
  onFilterChange,
  onClearAll,
  loading = false,
  resultCount,
  showResultCount = true
}: FilterControlsProps) => {
  const [sortMenuAnchor, setSortMenuAnchor] = useState<HTMLElement | null>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(event.target.value);
    }
  }, [onSearchChange]);

  const handleSortClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget);
  }, []);

  const handleSortClose = useCallback(() => {
    setSortMenuAnchor(null);
  }, []);

  const handleSortSelect = useCallback((sortValue: string) => {
    if (onSortChange) {
      const newDirection = currentSort === sortValue && sortDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(sortValue, newDirection);
    }
    handleSortClose();
  }, [currentSort, sortDirection, onSortChange, handleSortClose]);

  const handleFilterClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  }, []);

  const handleFilterClose = useCallback(() => {
    setFilterMenuAnchor(null);
  }, []);

  const handleFilterToggle = useCallback((filterValue: string) => {
    if (onFilterChange) {
      const newFilters = activeFilters.includes(filterValue)
        ? activeFilters.filter(f => f !== filterValue)
        : [...activeFilters, filterValue];
      onFilterChange(newFilters);
    }
  }, [activeFilters, onFilterChange]);

  const getCurrentSortLabel = useCallback(() => {
    if (!currentSort || !sortOptions.length) return 'Sort';
    const option = sortOptions.find(opt => opt.value === currentSort);
    const direction = sortDirection === 'desc' ? '↓' : '↑';
    return `${option?.label || 'Sort'} ${direction}`;
  }, [currentSort, sortDirection, sortOptions]);

  const hasActiveFilters = activeFilters.length > 0 || searchValue.length > 0;

  return (
    <Box sx={{ mb: 2 }}>
      <Stack spacing={2}>
        {/* Search Input */}
        {onSearchChange && (
          <SearchInput
            value={searchValue}
            onChange={handleSearchChange}
            loading={loading}
            fullWidth
          />
        )}

        {/* Controls Row */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {/* Sort Button */}
          {sortOptions.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<Sort size="20" />}
              endIcon={<KeyboardArrowDown size="20" />}
              onClick={handleSortClick}
              size="small"
              sx={{
                height: { xs: 44, sm: 36 },
                fontSize: { xs: '1rem', sm: '0.875rem' }
              }}
            >
              {getCurrentSortLabel()}
            </Button>
          )}

          {/* Filter Button */}
          {filterOptions.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<FilterList size="20" />}
              endIcon={<KeyboardArrowDown size="20" />}
              onClick={handleFilterClick}
              size="small"
              color={activeFilters.length > 0 ? 'primary' : 'inherit'}
              sx={{
                height: { xs: 44, sm: 36 },
                fontSize: { xs: '1rem', sm: '0.875rem' }
              }}
            >
              Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
            </Button>
          )}

          {/* Clear All Button */}
          {hasActiveFilters && onClearAll && (
            <Button
              variant="text"
              startIcon={<Clear size="20" />}
              onClick={onClearAll}
              size="small"
              color="inherit"
              sx={{
                height: { xs: 44, sm: 36 },
                fontSize: { xs: '1rem', sm: '0.875rem' }
              }}
            >
              Clear All
            </Button>
          )}

          {/* Result Count */}
          {showResultCount && resultCount !== undefined && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
              {resultCount} results
            </Typography>
          )}
        </Stack>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {activeFilters.map(filterValue => {
              const option = filterOptions.find(opt => opt.value === filterValue);
              return (
                <Chip
                  key={filterValue}
                  label={option?.label || filterValue}
                  size="small"
                  onDelete={() => handleFilterToggle(filterValue)}
                  color="primary"
                  variant="outlined"
                />
              );
            })}
          </Stack>
        )}
      </Stack>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={handleSortClose}
      >
        {sortOptions.map(option => (
          <MenuItem
            key={option.value}
            onClick={() => handleSortSelect(option.value)}
            selected={currentSort === option.value}
          >
            {option.icon && (
              <ListItemIcon>
                {option.icon}
              </ListItemIcon>
            )}
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterClose}
      >
        {filterOptions.map(option => (
          <MenuItem
            key={option.value}
            onClick={() => handleFilterToggle(option.value)}
          >
            <Checkbox
              checked={activeFilters.includes(option.value)}
              size="small"
            />
            {option.icon && (
              <ListItemIcon>
                {option.icon}
              </ListItemIcon>
            )}
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

FilterControls.displayName = 'FilterControls';