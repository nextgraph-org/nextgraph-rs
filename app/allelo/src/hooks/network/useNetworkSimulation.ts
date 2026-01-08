import { useEffect, useRef } from 'react';
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  Simulation,
} from 'd3-force';
import { GraphNode, GraphEdge } from '@/types/network';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';
import { getRadialDistance } from '@/utils/networkCentrality';

interface PrevDimensions {
  width: number;
  height: number;
}

export const useNetworkSimulation = (
  nodes: GraphNode[],
  width: number,
  height: number,
  isMobile: boolean,
) => {
  const simulationRef = useRef<Simulation<GraphNode, GraphEdge> | null>(null);
  const prevDimensionsRef = useRef<PrevDimensions | null>(null);
  const { setSimulation, updateNodePositions } = useNetworkGraphStore();

  useEffect(() => {
    if (!nodes.length) return;

    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate offset to translate nodes from old center to new center
    // This keeps nodes positioned relative to "Me" when canvas size changes
    let offsetX = 0;
    let offsetY = 0;
    if (prevDimensionsRef.current &&
        (prevDimensionsRef.current.width !== width || prevDimensionsRef.current.height !== height)) {
      const prevCenterX = prevDimensionsRef.current.width / 2;
      const prevCenterY = prevDimensionsRef.current.height / 2;
      offsetX = centerX - prevCenterX;
      offsetY = centerY - prevCenterY;
    }

    // Update ref for next render
    prevDimensionsRef.current = { width, height };

    const initializedNodes = nodes.map((node) => ({
      ...node,
      // If node has position and canvas center changed, translate it
      x: node.x != null ? node.x + offsetX : centerX + (Math.random() - 0.5) * 100,
      y: node.y != null ? node.y + offsetY : centerY + (Math.random() - 0.5) * 100,
      fx: node.isCentered ? centerX : null,
      fy: node.isCentered ? centerY : null,
    }));

    const maxRadius = Math.min(width, height) / 2 - 150;
    const nodeCount = initializedNodes.length;

    // Scale simulation parameters based on node count
    const isLargeGraph = nodeCount > 100;
    const alphaDecay = isLargeGraph ? 0.08 : 0.05;
    const velocityDecay = isLargeGraph ? 0.85 : 0.75;
    const chargeStrength = isLargeGraph ? -400 : -800;
    const collisionRadius = isLargeGraph ? 55 : 70;
    const radialStrength = isLargeGraph ? 1.5 : 1.2;

    const simulation = forceSimulation<GraphNode>(initializedNodes)
      .alphaDecay(alphaDecay)
      .alphaMin(0.01) // Stop earlier to prevent wiggle
      .alphaTarget(0)
      .velocityDecay(velocityDecay)
      .force(
        'charge',
        forceManyBody<GraphNode>()
          .strength(chargeStrength)
          .distanceMax(isLargeGraph ? 500 : 800)
      )
      .force('center', forceCenter<GraphNode>(centerX, centerY).strength(0.02))
      .force(
        'collision',
        forceCollide<GraphNode>()
          .radius(collisionRadius)
          .strength(0.8)
          .iterations(isLargeGraph ? 3 : 5)
      )
      .force(
        'radial',
        forceRadial<GraphNode>(
          (d) => {
            const centrality = d.centrality || 0;
            return getRadialDistance(centrality, maxRadius);
          },
          centerX,
          centerY
        ).strength(radialStrength)
      );

    if (!isMobile) {
      simulation.on('tick', () => {
        updateNodePositions([...simulation.nodes()]);
      })
        .on('end', () => {
          simulation.stop();
        });
    } else {
      simulation.stop();
      simulation.tick(Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())));
      updateNodePositions([...simulation.nodes()]);
    }
    simulationRef.current = simulation;
    setSimulation(simulation);

    return () => {
      simulation.stop();
    };
  }, [nodes.length, isMobile]); //TODO: do we need it to be animated?

  return simulationRef.current;
};
