import { Box, alpha, useTheme } from '@mui/material';

export interface NetworkMember {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  relationshipStrength: number;
  position: { x: number; y: number };
  connections: string[];
}

interface NetworkViewProps {
  members: NetworkMember[];
}

export const NetworkView = ({ members }: NetworkViewProps) => {
  const theme = useTheme();

  const getNodePosition = (member: NetworkMember) => {
    const centerX = 400;
    const centerY = 400;
    const scale = 1.8;

    const x = centerX + member.position.x * scale;
    const y = centerY + member.position.y * scale;

    return { x, y };
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        backgroundColor: 'action.selected',
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        m: 0,
        p: 1
      }}
    >
      <svg
        width="95%"
        height="95%"
        style={{ display: 'block' }}
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid meet"
      >
        {members.map(member =>
          member.connections?.map((connId: string) => {
            const connectedMember = members.find(m => m.id === connId);
            if (!connectedMember) return null;

            const startPos = getNodePosition(member);
            const endPos = getNodePosition(connectedMember);

            const coreMembers = ['oli-sb', 'ruben-daniels', 'margeigh-novotny'];
            const isCoreConnection = coreMembers.includes(member.id) && coreMembers.includes(connId);
            const isCenterConnection = member.id === 'oli-sb' || connId === 'oli-sb';

            let strength, strokeColor, opacity;

            if (isCoreConnection) {
              strength = 1.0;
              strokeColor = theme.palette.primary.main;
              opacity = 0.9;
            } else if (isCenterConnection) {
              strength = Math.max(member.relationshipStrength, connectedMember.relationshipStrength);
              strokeColor = theme.palette.primary.main;
              opacity = strength;
            } else {
              strength = 0.4;
              strokeColor = theme.palette.grey[400];
              opacity = 0.4;
            }

            return (
              <line
                key={`${member.id}-${connId}`}
                x1={startPos.x}
                y1={startPos.y}
                x2={endPos.x}
                y2={endPos.y}
                stroke={strokeColor}
                strokeWidth={strength * 5}
                opacity={opacity}
              />
            );
          })
        )}
        {members.map(member => {
          const nodePos = getNodePosition(member);
          return (
            <foreignObject
              key={member.id}
              x={nodePos.x - 60}
              y={nodePos.y - 30}
              width="120"
              height="140"
              style={{ overflow: 'visible' }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: `${member.id === 'oli-sb' ? 4 : 3}px solid ${
                      member.id === 'oli-sb'
                        ? theme.palette.primary.main
                        : alpha(theme.palette.primary.main, member.relationshipStrength)
                    }`,
                    boxShadow: member.id === 'oli-sb'
                      ? `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`
                      : `0 0 ${member.relationshipStrength * 15}px ${alpha(theme.palette.primary.main, 0.3)}`,
                    backgroundColor: member.id === 'oli-sb' ? alpha(theme.palette.primary.main, 0.1) : 'white',
                    backgroundImage: member.avatar ? `url(${member.avatar})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: member.id === 'oli-sb' ? theme.palette.primary.main : theme.palette.text.primary
                  }}
                >
                  {!member.avatar && member.initials}
                </div>

                <div
                  style={{
                    fontWeight: member.id === 'oli-sb' ? 700 : 500,
                    color: member.id === 'oli-sb' ? theme.palette.primary.main : theme.palette.text.primary,
                    textAlign: 'center',
                    backgroundColor: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: theme.shadows[2],
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {member.name}
                </div>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </Box>
  );
};