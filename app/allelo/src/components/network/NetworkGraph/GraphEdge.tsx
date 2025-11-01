import { useTheme } from '@mui/material';
import { GraphEdge as GraphEdgeType, GraphNode } from '@/types/network';

interface GraphEdgeProps {
  edge: GraphEdgeType;
  nodes: GraphNode[];
  onClick?: (edgeId: string) => void;
  isDimmed?: boolean;
}

export const GraphEdge = ({ edge, nodes, onClick, isDimmed }: GraphEdgeProps) => {
  const theme = useTheme();

  const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
  const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

  const source = nodes.find((n) => n.id === sourceId);
  const target = nodes.find((n) => n.id === targetId);

  if (!source?.x || !source?.y || !target?.x || !target?.y) return null;

  const getStrokeColor = () => {
    if (edge.type === 'weak') return theme.palette.grey[600];
    return theme.palette.grey[800];
  };

  const getStrokeWidth = () => {
    return edge.strength * 3;
  };

  const getStrokeDasharray = () => {
    if (edge.type === 'invitation') return '5,5';
    return undefined;
  };

  const getOpacity = () => {
    if (isDimmed) return 0.15;
    if (edge.type === 'weak') return 0.7;
    return 0.9;
  };

  return (
    <g>
      {/* Invisible thicker line for easier clicking */}
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke="transparent"
        strokeWidth={20}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(edge.id);
        }}
        style={{ cursor: edge.relationship ? 'pointer' : 'default' }}
      />
      {/* Visible line */}
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={getStrokeColor()}
        strokeWidth={getStrokeWidth()}
        strokeDasharray={getStrokeDasharray()}
        opacity={getOpacity()}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
};
