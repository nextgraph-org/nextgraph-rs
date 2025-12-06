import { IconButton, Paper, Typography, Box } from '@mui/material';
import { UilPlus, UilMinus, UilFocus } from '@iconscout/react-unicons';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControls = ({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) => {
  const canIncreaseCentrality = useNetworkGraphStore(state => state.canIncreaseCentrality());
  const canDecreaseCentrality = useNetworkGraphStore(state => state.canDecreaseCentrality());

  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        p: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
          Centrality
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={onZoomIn}
        title="Show more central contacts"
        disabled={!canIncreaseCentrality}
        sx={{
          color: canIncreaseCentrality ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, 0.26)',
        }}
      >
        <UilPlus size="20" />
      </IconButton>
      <IconButton
        size="small"
        onClick={onZoomOut}
        title="Show less central contacts"
        disabled={!canDecreaseCentrality}
        sx={{
          color: canDecreaseCentrality ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, 0.26)',
        }}
      >
        <UilMinus size="20" />
      </IconButton>
      <IconButton size="small" onClick={onReset} title="Reset centrality">
        <UilFocus size="20" />
      </IconButton>
    </Paper>
  );
};
