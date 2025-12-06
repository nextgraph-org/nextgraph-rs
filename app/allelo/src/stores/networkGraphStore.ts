import { create } from 'zustand';
import { GraphNode, GraphEdge } from '@/types/network';
import { Simulation } from 'd3-force';

interface NetworkGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centeredNodeId: string | null;
  viewHistory: string[];
  simulation: Simulation<GraphNode, GraphEdge> | null;
  currentZoomIndex: number; // 0-4, where 0=most zoomed in, 4=most zoomed out
  canvasSize: number; // The current canvas size in pixels
  maxZoomIndex: number; // Maximum zoom index available (depends on data)

  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  centerNode: (nodeId: string) => void;
  goBack: () => void;
  setSimulation: (simulation: Simulation<GraphNode, GraphEdge> | null) => void;
  updateNodePositions: (nodes: GraphNode[]) => void;
  setCanvasSize: (size: number) => void;
  setMaxZoomIndex: (maxIndex: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  canZoomIn: () => boolean;
  canZoomOut: () => boolean;
}

export const useNetworkGraphStore = create<NetworkGraphState>((set, get) => ({
  nodes: [],
  edges: [],
  centeredNodeId: null,
  viewHistory: [],
  simulation: null,
  currentZoomIndex: 0, // Start fully zoomed in (showing all contacts on largest canvas)
  canvasSize: 1200,
  maxZoomIndex: 4,

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  centerNode: (nodeId) => {
    const { centeredNodeId, viewHistory, nodes } = get();

    const updatedNodes = nodes.map((node) => ({
      ...node,
      isCentered: node.id === nodeId,
    }));

    if (nodeId === 'me') {
      set({
        nodes: updatedNodes,
        centeredNodeId: nodeId,
        viewHistory: [],
      });
    } else if (centeredNodeId && centeredNodeId !== nodeId) {
      set({
        nodes: updatedNodes,
        centeredNodeId: nodeId,
        viewHistory: [...viewHistory, centeredNodeId],
      });
    } else {
      set({
        nodes: updatedNodes,
        centeredNodeId: nodeId,
      });
    }
  },

  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length > 0) {
      const newHistory = [...viewHistory];
      const previousNodeId = newHistory.pop();
      set({
        centeredNodeId: previousNodeId || null,
        viewHistory: newHistory,
      });
    }
  },

  setSimulation: (simulation) => set({ simulation }),

  updateNodePositions: (updatedNodes) => {
    const { nodes } = get();
    const updatedNodesMap = new Map(updatedNodes.map((n) => [n.id, n]));

    const mergedNodes = nodes.map((node) => {
      const updated = updatedNodesMap.get(node.id);
      if (updated) {
        return {
          ...node,
          x: updated.x,
          y: updated.y,
          vx: updated.vx,
          vy: updated.vy,
          fx: updated.fx,
          fy: updated.fy,
        };
      }
      return node;
    });

    set({ nodes: mergedNodes });
  },

  setCanvasSize: (size) => set({ canvasSize: size }),

  setMaxZoomIndex: (maxIndex) => {
    const { currentZoomIndex } = get();
    // If currentZoomIndex is beyond the new max, reset to max
    if (currentZoomIndex > maxIndex) {
      set({ maxZoomIndex: maxIndex, currentZoomIndex: maxIndex });
    } else {
      set({ maxZoomIndex: maxIndex });
    }
  },

  zoomIn: () => {
    const { currentZoomIndex, maxZoomIndex } = get();
    if (currentZoomIndex < maxZoomIndex) {
      set({ currentZoomIndex: currentZoomIndex + 1 });
    }
  },

  zoomOut: () => {
    const { currentZoomIndex } = get();
    if (currentZoomIndex > 0) {
      set({ currentZoomIndex: currentZoomIndex - 1 });
    }
  },

  canZoomIn: () => {
    const { currentZoomIndex, maxZoomIndex } = get();
    return currentZoomIndex < maxZoomIndex;
  },

  canZoomOut: () => {
    const { currentZoomIndex } = get();
    return currentZoomIndex > 0;
  },
}));
