import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useNetworkViewStore, ViewType } from '@/stores/networkViewStore';

const VIEW_LABELS: Record<NonNullable<ViewType>, string> = {
  'work-history': 'Work History',
  'orgs-in-common': 'Organizations in Common',
  'people-in-common': 'People in Common',
  'all-connections': 'All Connections',
};

export const ViewSelector = () => {
  const { currentView, availableViews, setView } = useNetworkViewStore();

  const handleChange = (event: SelectChangeEvent<string>) => {
    setView(event.target.value as ViewType);
  };

  if (availableViews.length === 0) {
    return null;
  }

  const displayValue = currentView || availableViews[0] || '';

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <Select
        value={displayValue}
        onChange={handleChange}
        sx={{
          backgroundColor: 'white',
          '& .MuiSelect-select': {
            py: 1,
          },
        }}
      >
        {availableViews
          .filter((view): view is NonNullable<ViewType> => view !== null)
          .map((view) => (
            <MenuItem key={view} value={view}>
              {VIEW_LABELS[view]}
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
};
