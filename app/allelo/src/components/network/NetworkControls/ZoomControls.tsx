import { IconButton, Paper, Typography, Box } from '@mui/material';
import { UilPlus, UilMinus } from '@iconscout/react-unicons';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const ZoomControls = ({ onZoomIn, onZoomOut }: ZoomControlsProps) => {
  const canZoomIn = useNetworkGraphStore(state => state.canZoomIn());
  const canZoomOut = useNetworkGraphStore(state => state.canZoomOut());

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
          # contacts
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={onZoomIn}
        title="More contacts"
        disabled={!canZoomIn}
        sx={{
          color: canZoomIn ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, 0.26)',
        }}
      >
        <UilPlus size="20" />
      </IconButton>
      <IconButton
        size="small"
        onClick={onZoomOut}
        title="Fewer contacts"
        disabled={!canZoomOut}
        sx={{
          color: canZoomOut ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, 0.26)',
        }}
      >
        <UilMinus size="20" />
      </IconButton>
    </Paper>
  );
};
