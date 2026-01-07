import { useTheme, alpha } from '@mui/material';
import { GraphNode as GraphNodeType } from '@/types/network';
import {usePhotoOrm} from "@/hooks/usePhotoOrm.ts";
import {useCallback} from "react";

interface GraphNodeProps {
  node: GraphNodeType;
  onClick?: (nodeId: string) => void;
  onTouchStart?: (nodeId: string) => void;
  onTouchEnd?: (nodeId: string) => void;
  isDimmed?: boolean;
}

export const GraphNode = ({ node, onClick, onTouchStart, onTouchEnd, isDimmed = false }: GraphNodeProps) => {
  const theme = useTheme();
  const {displayUrl} = usePhotoOrm({"@id": node.id}, node.avatar);

  const getNodeColor = useCallback(() => {
    if (node.type === 'user') return theme.palette.grey[600];
    if (node.type === 'person') return '#D32F2F';
    if (node.type === 'entity') return theme.palette.primary.main;
    return theme.palette.grey[400];
  }, [node.type, theme.palette.grey, theme.palette.primary.main]);

  if (!node.x || !node.y) return null;

  if (node.priority === 'low') {
    return (
      <g opacity={isDimmed ? 0.15 : 1}>
        <text
          x={node.x}
          y={node.y}
          textAnchor="middle"
          fill={theme.palette.grey[400]}
          fontSize="12"
          fontWeight={400}
        >
          {node.name}
        </text>
      </g>
    );
  }

  const centrality = node.centrality ?? 0;

  if (node.priority === 'medium') {
    const isEntity = node.type === 'entity';
    const fillOpacity = isEntity ? 0.95 : (0.6 + centrality * 0.4);
    const radius = isEntity ? 16 : 8;

    return (
      <g
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(node.id);
        }}
        onTouchStart={() => onTouchStart?.(node.id)}
        onTouchEnd={() => onTouchEnd?.(node.id)}
        style={{ cursor: 'pointer' }}
        transform={`translate(${node.x}, ${node.y})`}
        opacity={isDimmed ? 0.15 : 1}
      >
        <circle
          r={radius}
          fill={getNodeColor()}
          stroke={isEntity ? getNodeColor() : 'none'}
          strokeWidth={isEntity ? 2 : 0}
          opacity={fillOpacity}
        />
      </g>
    );
  }

  const baseSize = node.isCentered ? 40 : 30;
  const nodeSize = baseSize;
  const borderWidth = 2;
  const isEntity = node.type === 'entity';

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(node.id);
      }}
      onTouchStart={() => onTouchStart?.(node.id)}
      onTouchEnd={() => onTouchEnd?.(node.id)}
      style={{ cursor: 'pointer' }}
      transform={`translate(${node.x}, ${node.y})`}
      opacity={isDimmed ? 0.15 : 1}
    >
      {displayUrl ? (
        <image
          href={displayUrl}
          x={-nodeSize / 2}
          y={-nodeSize / 2}
          width={nodeSize}
          height={nodeSize}
          clipPath={node.isCentered ? 'url(#clip-circle-centered)' : 'url(#clip-circle-normal)'}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          <circle
            r={nodeSize / 2 - borderWidth}
            fill={isEntity ? getNodeColor() : alpha(getNodeColor(), 0.2)}
            stroke={getNodeColor()}
            strokeWidth={borderWidth}
            opacity={isEntity ? 0.95 : 1}
            filter={node.isCentered ? 'url(#glow)' : undefined}
          />
          <text
            textAnchor="middle"
            dy=".35em"
            fill={isEntity ? 'white' : getNodeColor()}
            fontSize="14"
            fontWeight={600}
          >
            {node.name === "ME" ? node.name : node.initials}
          </text>
        </>
      )}
    </g>
  );
};
