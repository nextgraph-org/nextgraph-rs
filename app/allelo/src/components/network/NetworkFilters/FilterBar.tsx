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
          sx={{
            height: { xs: 36, sm: 32 },
            fontSize: { xs: '0.9375rem', sm: '0.8125rem' }
          }}
        />
      )}
      {activeFilters.naoMembership !== undefined && (
        <Chip
          label={activeFilters.naoMembership ? 'NAO Members' : 'Non-NAO'}
          onDelete={() => removeFilter('naoMembership')}
          size="small"
          sx={{
            height: { xs: 36, sm: 32 },
            fontSize: { xs: '0.9375rem', sm: '0.8125rem' }
          }}
        />
      )}
      {activeFilters.source && (
        <Chip
          label={`Source: ${activeFilters.source}`}
          onDelete={() => removeFilter('source')}
          size="small"
          sx={{
            height: { xs: 36, sm: 32 },
            fontSize: { xs: '0.9375rem', sm: '0.8125rem' }
          }}
        />
      )}
      {activeFilters.dateRange && (
        <Chip
          label="Date Range"
          onDelete={() => removeFilter('dateRange')}
          size="small"
          sx={{
            height: { xs: 36, sm: 32 },
            fontSize: { xs: '0.9375rem', sm: '0.8125rem' }
          }}
        />
      )}
      {hasFilters && (
        <IconButton
          size="small"
          onClick={clearFilters}
          title="Clear all filters"
          sx={{
            width: { xs: 36, sm: 32 },
            height: { xs: 36, sm: 32 }
          }}
        >
          <Close size="16" />
        </IconButton>
      )}
    </Box>
  );
};
