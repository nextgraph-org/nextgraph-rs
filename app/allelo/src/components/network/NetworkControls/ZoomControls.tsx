import { IconButton, Paper } from '@mui/material';
import { UilPlus, UilMinus, UilFocus } from '@iconscout/react-unicons';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControls = ({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <IconButton size="small" onClick={onZoomIn} title="Zoom in">
        <UilPlus size="20" />
      </IconButton>
      <IconButton size="small" onClick={onZoomOut} title="Zoom out">
        <UilMinus size="20" />
      </IconButton>
      <IconButton size="small" onClick={onReset} title="Reset view">
        <UilFocus size="20" />
      </IconButton>
    </Paper>
  );
};
