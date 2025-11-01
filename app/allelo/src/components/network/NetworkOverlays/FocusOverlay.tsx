import { Box } from '@mui/material';
import { GraphEdge } from '@/types/network';

interface FocusOverlayProps {
  focusedEdge: GraphEdge | null;
}

export const FocusOverlay = ({ focusedEdge }: FocusOverlayProps) => {
  if (!focusedEdge) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <defs>
          <filter id="dim">
            <feColorMatrix type="saturate" values="0.3" />
          </filter>
        </defs>
      </svg>
    </Box>
  );
};
