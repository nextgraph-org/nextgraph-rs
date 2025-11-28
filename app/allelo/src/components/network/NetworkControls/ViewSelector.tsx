import { FormControl, Select, MenuItem, SelectChangeEvent, Checkbox, ListItemText } from '@mui/material';
import { useNetworkViewStore, ViewType } from '@/stores/networkViewStore';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';
import { useMemo } from 'react';

const VIEW_LABELS: Record<NonNullable<ViewType>, string> = {
  'work-history': 'Work History',
  'orgs-in-common': 'Organizations in Common',
  'people-in-common': 'People in Common',
  'all-connections': 'All Connections',
};

// Predefined relationship types that can appear in the graph
const RELATIONSHIP_LABELS: Record<string, string> = {
  'colleague': 'Colleague',
  'former colleague': 'Former Colleague',
  'alumni': 'Alumni',
  'collaborator': 'Collaborator',
  'shared interests': 'Shared Interests',
  'spouse': 'Spouse',
  'child': 'Child',
  'parent': 'Parent',
  'sibling': 'Sibling',
  'partner': 'Partner',
  'connection': 'Connection',
};

export const ViewSelector = () => {
  const { currentView, availableViews, setView, activeFilters, setFilter } = useNetworkViewStore();
  const { edges } = useNetworkGraphStore();

  // Extract unique relationship types from current edges
  const availableRelationships = useMemo(() => {
    const relationships = new Set<string>();
    edges.forEach(edge => {
      if (edge.relationship) {
        relationships.add(edge.relationship);
      }
    });
    return Array.from(relationships).sort();
  }, [edges]);

  const handleViewChange = (event: SelectChangeEvent<string>) => {
    setView(event.target.value as ViewType);
  };

  const handleRelationshipChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const selectedRelationships = typeof value === 'string' ? value.split(',') : value;
    setFilter({ relationships: selectedRelationships.length > 0 ? selectedRelationships : undefined });
  };

  if (availableViews.length === 0) {
    return null;
  }

  const displayView = currentView || availableViews[0] || '';
  const isAllConnectionsView = displayView === 'all-connections';
  const selectedRelationships = activeFilters.relationships || [];

  // Show view selector if there are multiple views, otherwise show relationship filter
  if (availableViews.length > 1) {
    return (
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <Select
          value={displayView}
          onChange={handleViewChange}
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
  }

  // For "All Connections" view, show relationship filter
  if (isAllConnectionsView && availableRelationships.length > 0) {
    return (
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <Select
          multiple
          value={selectedRelationships}
          onChange={handleRelationshipChange}
          displayEmpty
          renderValue={(selected) => {
            if (selected.length === 0) {
              return 'All Connections';
            }
            if (selected.length === 1) {
              return RELATIONSHIP_LABELS[selected[0]] || selected[0];
            }
            return `${selected.length} Relationships`;
          }}
          sx={{
            backgroundColor: 'white',
            '& .MuiSelect-select': {
              py: 1,
            },
          }}
        >
          <MenuItem value="" disabled>
            <em>Filter by Relationship</em>
          </MenuItem>
          {availableRelationships.map((relationship) => (
            <MenuItem key={relationship} value={relationship}>
              <Checkbox checked={selectedRelationships.indexOf(relationship) > -1} />
              <ListItemText primary={RELATIONSHIP_LABELS[relationship] || relationship} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Fallback: just show the current view
  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <Select
        value={displayView}
        onChange={handleViewChange}
        sx={{
          backgroundColor: 'white',
          '& .MuiSelect-select': {
            py: 1,
          },
        }}
      >
        <MenuItem value={displayView}>
          {VIEW_LABELS[displayView]}
        </MenuItem>
      </Select>
    </FormControl>
  );
};
