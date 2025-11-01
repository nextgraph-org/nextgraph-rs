import { Box, Avatar, Typography, alpha, useTheme } from '@mui/material';

interface MapMember {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  location?: { lat: number; lng: number; visible: boolean };
}

interface MapViewProps {
  members: MapMember[];
}

export const MapView = ({ members }: MapViewProps) => {
  const theme = useTheme();
  const visibleMembers = members.filter(m => m.location?.visible);
  
  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <Box
        sx={{
          position: 'relative',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          backgroundImage: `url('images/world-map.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: 'background.default'
        }}
      >
        {visibleMembers.map((member, index) => {
          const positions = [
            { x: 15, y: 25 }, { x: 25, y: 30 }, { x: 35, y: 35 }, 
            { x: 45, y: 25 }, { x: 55, y: 30 }, { x: 65, y: 40 }, 
            { x: 75, y: 30 }
          ];
          
          const position = positions[index % positions.length];
          const x = `${position.x + (Math.random() - 0.5) * 5}%`;
          const y = `${position.y + (Math.random() - 0.5) * 5}%`;
          
          return (
            <Box
              key={member.id}
              sx={{
                position: 'absolute',
                left: x,
                top: y,
                zIndex: 10,
                cursor: 'pointer'
              }}
            >
              <Avatar
                src={member.avatar}
                sx={{
                  width: 32,
                  height: 32,
                  border: 2,
                  borderColor: member.id === 'oli-sb' ? 'primary.main' : 'success.main',
                  boxShadow: member.id === 'oli-sb' 
                    ? `0 0 10px ${alpha(theme.palette.primary.main, 0.6)}`
                    : `0 0 6px ${alpha(theme.palette.success.main, 0.4)}`,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {member.initials}
              </Avatar>
              
              <Box
                sx={{
                  position: 'absolute',
                  top: -32,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'background.paper',
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: 1,
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {member.name.split(' ')[0]}
              </Box>
            </Box>
          );
        })}
        
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            backgroundColor: 'background.paper',
            p: 1,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            boxShadow: 2
          }}
        >
          <Typography variant="caption" gutterBottom sx={{ fontWeight: 600 }}>
            Location Sharing
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, backgroundColor: 'success.main', borderRadius: '50%' }} />
              <Typography variant="caption">{visibleMembers.length} visible</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, backgroundColor: 'grey.400', borderRadius: '50%' }} />
              <Typography variant="caption">{members.length - visibleMembers.length} private</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};