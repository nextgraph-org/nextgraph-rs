import { Box, Avatar, IconButton } from '@mui/material';
import { UilArrowLeft as ArrowBack } from '@iconscout/react-unicons';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';

export const NavigationTrail = () => {
  const { viewHistory, goBack, nodes } = useNetworkGraphStore();

  if (viewHistory.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        backgroundColor: 'white',
        borderRadius: 2,
        px: 2,
        py: 1,
        boxShadow: 2,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <IconButton size="small" onClick={goBack}>
        <ArrowBack size="16" />
      </IconButton>
      {viewHistory.slice(-3).map((nodeId, index) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return null;

        return (
          <Avatar
            key={`${nodeId}-${index}`}
            src={node.avatar}
            sx={{
              width: 32,
              height: 32,
              fontSize: '0.75rem',
              bgcolor: 'primary.main',
            }}
          >
            {node.initials}
          </Avatar>
        );
      })}
    </Box>
  );
};
