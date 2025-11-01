import { useTheme } from '@mui/material';
import { GraphNode } from '@/types/network';

interface GraphLabelsProps {
  nodes: GraphNode[];
}

export const GraphLabels = ({ nodes }: GraphLabelsProps) => {
  const theme = useTheme();

  const calculateLabelPosition = (node: GraphNode) => {
    if (!node.x || !node.y) return { x: 0, y: 0 };

    if (node.isCentered) {
      const nodeSize = 80;
      return {
        x: node.x + nodeSize / 2 + 10,
        y: node.y,
      };
    }

    if (node.priority === 'low') {
      return { x: node.x, y: node.y };
    }

    const nodeSize = 40;
    return {
      x: node.x,
      y: node.y - nodeSize / 2 - 15,
    };
  };

  return (
    <g className="labels">
      {nodes
        .filter((node) => node.priority !== 'low' && node.x && node.y)
        .map((node) => {
          const pos = calculateLabelPosition(node);
          return (
            <text
              key={`label-${node.id}`}
              x={pos.x}
              y={pos.y}
              textAnchor={node.isCentered ? 'start' : 'middle'}
              fill={theme.palette.text.primary}
              fontSize={node.isCentered ? '16' : '12'}
              fontWeight={node.isCentered ? 700 : 500}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {node.name}
            </text>
          );
        })}
    </g>
  );
};
