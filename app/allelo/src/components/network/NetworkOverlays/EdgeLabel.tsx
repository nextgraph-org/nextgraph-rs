import { GraphEdge, GraphNode } from '@/types/network';

interface EdgeLabelProps {
  edge: GraphEdge | null;
  nodes: GraphNode[];
}

export const EdgeLabel = ({ edge, nodes }: EdgeLabelProps) => {
  if (!edge || !edge.relationship) return null;

  const source = nodes.find((n) => n.id === (typeof edge.source === 'string' ? edge.source : edge.source.id));
  const target = nodes.find((n) => n.id === (typeof edge.target === 'string' ? edge.target : edge.target.id));

  if (!source?.x || !source?.y || !target?.x || !target?.y) return null;

  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;

  // Calculate text width estimate for background sizing
  const textWidth = edge.relationship.length * 8 + 32;
  const height = 28;

  return (
    <g>
      {/* Background rounded rectangle */}
      <rect
        x={midX - textWidth / 2}
        y={midY - height / 2}
        width={textWidth}
        height={height}
        rx={4}
        fill="rgba(255, 255, 255, 0.95)"
        stroke="#ddd"
        strokeWidth={1}
        filter="drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2))"
      />
      {/* Relationship text */}
      <text
        x={midX}
        y={midY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
        fontWeight={500}
        fill="#333"
        style={{ pointerEvents: 'none' }}
      >
        {edge.relationship}
      </text>
    </g>
  );
};
