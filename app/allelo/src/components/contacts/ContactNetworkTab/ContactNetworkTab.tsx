import { Box } from '@mui/material';
import { NetworkGraph } from '@/components/network/NetworkGraph';

export const ContactNetworkTab = () => {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <NetworkGraph />
    </Box>
  );
};