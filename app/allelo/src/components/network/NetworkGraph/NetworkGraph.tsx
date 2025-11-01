import { Box, Fab } from '@mui/material';
import { useRef, useState } from 'react';
import { UilSearch } from '@iconscout/react-unicons';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';
import { useNetworkViewStore } from '@/stores/networkViewStore';
import { useNetworkSimulation } from '@/hooks/network/useNetworkSimulation';
import { useNodeInteraction } from '@/hooks/network/useNodeInteraction';
import { GraphCanvas } from './GraphCanvas';
import { NetworkSearch } from '../NetworkOverlays';
import { ViewSelector, NavigationTrail, ZoomControls } from '../NetworkControls';
import { FilterBar } from '../NetworkFilters';
import { GraphEdge } from '@/types/network';

interface NetworkGraphProps {
  backgroundColor?: string;
}

export const NetworkGraph = ({ backgroundColor = '#F7F3EA' }: NetworkGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions] = useState({ width: 1200, height: 800 });
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const { nodes, edges, centerNode, simulation } = useNetworkGraphStore();
  const { setSearchOpen } = useNetworkViewStore();

  useNetworkSimulation(nodes, edges, dimensions.width, dimensions.height);

  const { handleClick, handleTouchStart, handleTouchEnd } = useNodeInteraction({
    onNodeClick: (nodeId) => {
      setSelectedEdge(null);
      centerNode(nodeId);
    },
    onNodeLongPress: (nodeId) => {
      setSelectedEdge(null);
      centerNode(nodeId);
    },
  });

  const handleEdgeClick = (edgeId: string) => {
    const edge = edges.find((e) => e.id === edgeId);
    if (edge && edge.relationship) {
      setSelectedEdge(edge);
    }
  };

  const handleDismissEdge = () => {
    setSelectedEdge(null);
  };

  const handleZoomIn = () => {
    if (simulation) {
      simulation.alpha(0.3).restart();
    }
  };

  const handleZoomOut = () => {
    if (simulation) {
      simulation.alpha(0.3).restart();
    }
  };

  const handleResetView = () => {
    if (simulation) {
      simulation.alpha(1).restart();
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        height: '100%',
        width: '100%',
        backgroundColor,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        m: 0,
        p: 1,
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 5 }}>
        <ViewSelector />
      </Box>

      <FilterBar />

      <Fab
        color="primary"
        size="small"
        onClick={() => setSearchOpen(true)}
        sx={{ position: 'absolute', top: 16, right: 16, zIndex: 5 }}
      >
        <UilSearch size="20" />
      </Fab>

      <GraphCanvas
        nodes={nodes}
        edges={edges}
        width={dimensions.width}
        height={dimensions.height}
        onNodeClick={handleClick}
        onNodeTouchStart={handleTouchStart}
        onNodeTouchEnd={handleTouchEnd}
        onEdgeClick={handleEdgeClick}
        selectedEdge={selectedEdge}
        onBackgroundClick={handleDismissEdge}
      />

      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
      />

      <NavigationTrail />
      <NetworkSearch />
    </Box>
  );
};
