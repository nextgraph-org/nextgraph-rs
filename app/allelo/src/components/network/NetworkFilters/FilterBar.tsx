import { Box, Chip, IconButton } from '@mui/material';
import { UilTimes as Close, UilFilter as FilterList } from '@iconscout/react-unicons';
import { useNetworkViewStore } from '@/stores/networkViewStore';

export const FilterBar = () => {
  const { activeFilters, clearFilters, setFilter } = useNetworkViewStore();

  const hasFilters =
    activeFilters.category ||
    activeFilters.naoMembership !== undefined ||
    activeFilters.source ||
    activeFilters.dateRange;

  if (!hasFilters) return null;

  const removeFilter = (key: keyof typeof activeFilters) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setFilter(newFilters);
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 64,
        left: 16,
        zIndex: 5,
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <FilterList size="20" style={{ color: 'inherit' }} />
      {activeFilters.category && (
        <Chip
          label={`Category: ${activeFilters.category}`}
          onDelete={() => removeFilter('category')}
          size="small"
        />
      )}
      {activeFilters.naoMembership !== undefined && (
        <Chip
          label={activeFilters.naoMembership ? 'NAO Members' : 'Non-NAO'}
          onDelete={() => removeFilter('naoMembership')}
          size="small"
        />
      )}
      {activeFilters.source && (
        <Chip
          label={`Source: ${activeFilters.source}`}
          onDelete={() => removeFilter('source')}
          size="small"
        />
      )}
      {activeFilters.dateRange && (
        <Chip label="Date Range" onDelete={() => removeFilter('dateRange')} size="small" />
      )}
      {hasFilters && (
        <IconButton size="small" onClick={clearFilters} title="Clear all filters">
          <Close size="16" />
        </IconButton>
      )}
    </Box>
  );
};
