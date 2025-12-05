export type NodeType = 'person' | 'entity' | 'user';
export type NodePriority = 'high' | 'medium' | 'low';
export type EdgeType = 'confirmed' | 'invitation' | 'weak';

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  avatar?: string;
  initials: string;
  isCentered: boolean;
  priority: NodePriority;
  centrality?: number;
  mostRecentInteraction?: string | Date;
  // minZoomLevel: 0 = visible at all zoom levels, 4 = only visible when fully zoomed out
  minZoomLevel?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: EdgeType;
  relationship?: string;
  strength: number;
}

export interface SimulationConfig {
  alphaDecay: number;
  velocityDecay: number;
  forces: {
    charge: {
      strength: number;
      distanceMax: number;
    };
    link: {
      distance: number;
      strength: number;
    };
    center: {
      strength: number;
    };
    collision: {
      radius: number;
      strength: number;
    };
  };
}
