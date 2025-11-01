import { useEffect, useRef } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  Simulation,
} from 'd3-force';
import { GraphNode, GraphEdge, SimulationConfig } from '@/types/network';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';
import { getRadialDistance } from '@/utils/networkCentrality';

const DEFAULT_CONFIG: SimulationConfig = {
  alphaDecay: 0.08,
  velocityDecay: 0.7,
  forces: {
    charge: {
      strength: -300,
      distanceMax: 400,
    },
    link: {
      distance: 100,
      strength: 0.5,
    },
    center: {
      strength: 0.1,
    },
    collision: {
      radius: 50,
      strength: 0.8,
    },
  },
};

export const useNetworkSimulation = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  config: SimulationConfig = DEFAULT_CONFIG
) => {
  const simulationRef = useRef<Simulation<GraphNode, GraphEdge> | null>(null);
  const { setSimulation, updateNodePositions, setEdges } = useNetworkGraphStore();

  useEffect(() => {
    if (!nodes.length) return;

    const centerX = width / 2;
    const centerY = height / 2;

    const initializedNodes = nodes.map((node) => ({
      ...node,
      x: node.x ?? centerX + (Math.random() - 0.5) * 100,
      y: node.y ?? centerY + (Math.random() - 0.5) * 100,
      fx: node.isCentered ? centerX : null,
      fy: node.isCentered ? centerY : null,
    }));

    const edgesCopy = edges.map((edge) => ({ ...edge }));

    const linkForce = forceLink<GraphNode, GraphEdge>(edgesCopy)
      .id((d) => d.id)
      .distance(config.forces.link.distance)
      .strength(config.forces.link.strength);

    const maxRadius = Math.min(width, height) / 2 - 100;

    const simulation = forceSimulation<GraphNode>(initializedNodes)
      .alphaDecay(config.alphaDecay)
      .alphaMin(0.01)
      .alphaTarget(0)
      .velocityDecay(config.velocityDecay)
      .force('link', linkForce)
      .force(
        'charge',
        forceManyBody<GraphNode>()
          .strength(config.forces.charge.strength)
          .distanceMax(config.forces.charge.distanceMax)
      )
      .force('center', forceCenter<GraphNode>(centerX, centerY).strength(config.forces.center.strength))
      .force(
        'collision',
        forceCollide<GraphNode>()
          .radius((d) => {
            const centrality = d.centrality || 0;
            return config.forces.collision.radius + centrality * 10;
          })
          .strength(config.forces.collision.strength)
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
        ).strength(0.3)
      )
      .on('tick', () => {
        if (simulation.alpha() < 0.01) {
          simulation.stop();
        }
        updateNodePositions([...simulation.nodes()]);
        setEdges(edgesCopy);
      })
      .on('end', () => {
        simulation.stop();
      });

    simulationRef.current = simulation;
    setSimulation(simulation);

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, width, height, config, setSimulation, updateNodePositions, setEdges]);

  return simulationRef.current;
};
