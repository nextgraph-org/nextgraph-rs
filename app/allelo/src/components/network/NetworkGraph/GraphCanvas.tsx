import { useRef, useEffect } from 'react';
import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { GraphNode as GraphNodeType, GraphEdge as GraphEdgeType } from '@/types/network';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';
import { GraphLabels } from './GraphLabels';
import { EdgeLabel } from '../NetworkOverlays';

interface GraphCanvasProps {
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
  width: number;
  height: number;
  onNodeClick?: (nodeId: string) => void;
  onNodeTouchStart?: (nodeId: string) => void;
  onNodeTouchEnd?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  selectedEdge?: GraphEdgeType | null;
  onBackgroundClick?: () => void;
}

export const GraphCanvas = ({
  nodes,
  edges,
  width,
  height,
  onNodeClick,
  onNodeTouchStart,
  onNodeTouchEnd,
  onEdgeClick,
  selectedEdge,
  onBackgroundClick,
}: GraphCanvasProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = select(svgRef.current);
    const g = select(gRef.current);

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior.transform, zoomIdentity);
    svg.call(zoomBehavior);

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  // Get source and target node IDs for the selected edge
  const selectedSourceId = selectedEdge
    ? (typeof selectedEdge.source === 'string' ? selectedEdge.source : selectedEdge.source.id)
    : null;
  const selectedTargetId = selectedEdge
    ? (typeof selectedEdge.target === 'string' ? selectedEdge.target : selectedEdge.target.id)
    : null;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
      onClick={onBackgroundClick}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="clip-circle-normal">
          <circle r="20" />
        </clipPath>
        <clipPath id="clip-circle-centered">
          <circle r="40" />
        </clipPath>
      </defs>

      <g ref={gRef}>
        <g className="radial-grid" opacity={0.1}>
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <circle
              key={ratio}
              cx={width / 2}
              cy={height / 2}
              r={(Math.min(width, height) / 2 - 100) * ratio}
              fill="none"
              stroke="#999"
              strokeWidth={1}
            />
          ))}
        </g>

        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="none"
          stroke="#999"
          strokeWidth={2}
          strokeDasharray="8 4"
          opacity={0.3}
          pointerEvents="none"
        />

        <g className="edges">
          {edges.map((edge) => {
            const isSelected = selectedEdge?.id === edge.id;
            const isDimmed = !!(selectedEdge && !isSelected);
            return (
              <GraphEdge
                key={edge.id}
                edge={edge}
                nodes={nodes}
                onClick={onEdgeClick}
                isDimmed={isDimmed}
              />
            );
          })}
        </g>

        <g className="nodes">
          {nodes.map((node) => {
            const isConnected = node.id === selectedSourceId || node.id === selectedTargetId;
            const isDimmed = !!(selectedEdge && !isConnected);

            return (
              <GraphNode
                key={node.id}
                node={node}
                onClick={onNodeClick}
                onTouchStart={onNodeTouchStart}
                onTouchEnd={onNodeTouchEnd}
                isDimmed={isDimmed}
              />
            );
          })}
        </g>

        <GraphLabels nodes={nodes} />

        {selectedEdge && <EdgeLabel edge={selectedEdge} nodes={nodes} />}
      </g>
    </svg>
  );
};
