import { Box, Fab, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, useMediaQuery, useTheme, CircularProgress } from '@mui/material';
import { useRef, useState, useMemo, useEffect } from 'react';
import { UilSearch, UilInfoCircle } from '@iconscout/react-unicons';
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { nodes, edges, centerNode, increaseCentrality, decreaseCentrality, resetCentrality, centralityRangeMin, centralityRangeMax, centeredNodeId } = useNetworkGraphStore();
  const { setSearchOpen } = useNetworkViewStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Track loading state - wait for nodes and edges to be available
  useEffect(() => {
    if (nodes.length > 0) {
      // Add a small delay to ensure simulation has started and nodes have settled
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(true);
    }
  }, [nodes.length, edges.length, centralityRangeMin, centralityRangeMax, centeredNodeId]);

  // Filter nodes by centrality range (only when viewing "Me" network)
  const filteredNodes = useMemo(() => {
    const isViewingMe = !centeredNodeId || centeredNodeId === 'me';

    if (!isViewingMe) {
      return nodes;
    }

    const specialNodes = nodes.filter(node =>
      node.type === 'user' || node.type === 'entity' || node.isCentered
    );
    const regularNodes = nodes.filter(node =>
      node.type !== 'user' && node.type !== 'entity' && !node.isCentered
    );

    let filtered = regularNodes.filter(node => {
      const centrality = node.centrality ?? 0;
      return centrality >= centralityRangeMin && centrality <= centralityRangeMax;
    });

    filtered = filtered
      .sort((a, b) => {
        const aTime = a.mostRecentInteraction
          ? new Date(a.mostRecentInteraction).getTime()
          : 0;
        const bTime = b.mostRecentInteraction
          ? new Date(b.mostRecentInteraction).getTime()
          : 0;
        return bTime - aTime;
      })
      .slice(0, 20);

    return [...specialNodes, ...filtered];
  }, [nodes, centralityRangeMin, centralityRangeMax, centeredNodeId]);

  // Filter edges to only include those where both nodes are visible
  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
  }, [edges, filteredNodes]);

  useNetworkSimulation(filteredNodes, filteredEdges, dimensions.width, dimensions.height);

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

  const handleCentralityIn = () => {
    increaseCentrality();
  };

  const handleCentralityOut = () => {
    decreaseCentrality();
  };

  const handleResetCentrality = () => {
    resetCentrality();
  };

  const helpContent = isMobile ? (
    <>
      <DialogContentText gutterBottom>
        <strong>Navigation:</strong>
      </DialogContentText>
      <DialogContentText gutterBottom>
        • Tap a contact to center the view on them
      </DialogContentText>
      <DialogContentText gutterBottom>
        • Pinch to zoom in/out
      </DialogContentText>
      <DialogContentText gutterBottom sx={{ mt: 2 }}>
        <strong>Centrality Controls (bottom right):</strong>
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>+</strong> Show more central contacts (more connections in common)
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>−</strong> Show less central contacts (fewer connections in common)
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>Reset</strong> Show all contacts
      </DialogContentText>
      <DialogContentText sx={{ mt: 2 }}>
        Contacts closer to the center have higher centrality scores. Use +/− to filter by centrality ranges.
        Contacts are filtered by most recent interaction to prevent density issues overwhelming the graph.
      </DialogContentText>
    </>
  ) : (
    <>
      <DialogContentText gutterBottom>
        <strong>Navigation:</strong>
      </DialogContentText>
      <DialogContentText gutterBottom>
        • Click a contact to center the view on them
      </DialogContentText>
      <DialogContentText gutterBottom>
        • Scroll wheel to zoom in/out
      </DialogContentText>
      <DialogContentText gutterBottom>
        • Drag to pan the view
      </DialogContentText>
      <DialogContentText gutterBottom sx={{ mt: 2 }}>
        <strong>Centrality Controls (bottom right):</strong>
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>+</strong> Show more central contacts (more connections in common)
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>−</strong> Show less central contacts (fewer connections in common)
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>Reset</strong> Show all contacts
      </DialogContentText>
      <DialogContentText sx={{ mt: 2 }}>
        Contacts closer to the center have higher centrality scores. Use +/− to filter by centrality ranges.
        Contacts are filtered by most recent interaction to prevent density issues overwhelming the graph.
      </DialogContentText>
    </>
  );

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

      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 5, display: 'flex', gap: 1, alignItems: 'center' }}>
        {isLoading && (
          <CircularProgress size={20} sx={{ color: 'primary.main' }} />
        )}
        <Fab
          color="primary"
          size="small"
          onClick={() => setSearchOpen(true)}
        >
          <UilSearch size="20" />
        </Fab>
      </Box>

      <GraphCanvas
        nodes={filteredNodes}
        edges={filteredEdges}
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
        onZoomIn={handleCentralityIn}
        onZoomOut={handleCentralityOut}
        onReset={handleResetCentrality}
      />

      <IconButton
        onClick={() => setHelpOpen(true)}
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 5,
          backgroundColor: 'background.paper',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
        size="small"
      >
        <UilInfoCircle size="20" />
      </IconButton>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Network Graph Guide</DialogTitle>
        <DialogContent>
          {helpContent}
        </DialogContent>
      </Dialog>

      <NavigationTrail />
      <NetworkSearch />
    </Box>
  );
};
