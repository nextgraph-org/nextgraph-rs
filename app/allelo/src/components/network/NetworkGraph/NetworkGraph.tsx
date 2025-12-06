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
import { computeZoom, ZoomInfo } from '@/hooks/network/computeZoom';

interface NetworkGraphProps {
  backgroundColor?: string;
}

export const NetworkGraph = ({ backgroundColor = '#F7F3EA' }: NetworkGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 1200, height: 800 });

  // Measure actual viewport dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewportDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const {
    nodes,
    edges,
    centerNode,
    currentZoomIndex,
    canvasSize,
    setCanvasSize,
    setMaxZoomIndex,
    zoomIn,
    zoomOut,
    centeredNodeId
  } = useNetworkGraphStore();
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
  }, [nodes.length, edges.length, currentZoomIndex, centeredNodeId]);

  // Compute zoom levels based on contact data
  // Level 0 = zoomed in (largest canvas, all contacts)
  // Level 4 = zoomed out (smallest canvas, fewer contacts)
  const zoomLevels = useMemo(() => {
    const isViewingMe = !centeredNodeId || centeredNodeId === 'me';
    if (!isViewingMe) {
      // When viewing specific contact/entity, don't use zoom system
      return [];
    }

    // Count contacts by centrality ranges
    const regularNodes = nodes.filter(node =>
      node.type !== 'user' && node.type !== 'entity' && !node.isCentered
    );

    const c10 = regularNodes.filter(n => (n.centrality ?? 0) >= 0.8).length;
    const c8 = regularNodes.filter(n => (n.centrality ?? 0) >= 0.6 && (n.centrality ?? 0) < 0.8).length;
    const c6 = regularNodes.filter(n => (n.centrality ?? 0) >= 0.4 && (n.centrality ?? 0) < 0.6).length;
    const c4 = regularNodes.filter(n => (n.centrality ?? 0) >= 0.2 && (n.centrality ?? 0) < 0.4).length;
    const c2 = regularNodes.filter(n => (n.centrality ?? 0) < 0.2).length;

    const maxDimension = Math.max(viewportDimensions.width, viewportDimensions.height);
    const rawLevels = computeZoom(
      new ZoomInfo(maxDimension, c10, c8, c6, c4, c2)
    );

    // Reverse levels so index 0 = largest canvas (zoomed in), index 4 = smallest (zoomed out)
    const reversedLevels = [...rawLevels].reverse();

    // Ensure exactly 5 levels by padding if needed
    const paddedLevels: ZoomInfo[] = [];
    for (let i = 0; i < 5; i++) {
      if (i < reversedLevels.length) {
        const level = reversedLevels[i];
        level.level = i;
        paddedLevels.push(level);
      } else {
        // Duplicate the last level if we have fewer than 5
        const lastLevel = reversedLevels[reversedLevels.length - 1];
        const padded = ZoomInfo.fromArray(lastLevel.viewSize, lastLevel.getArray());
        padded.level = i;
        paddedLevels.push(padded);
      }
    }

    return paddedLevels;
  }, [nodes, viewportDimensions, centeredNodeId]);

  // Update max zoom index and canvas size when zoom levels change
  useEffect(() => {
    const isViewingMe = !centeredNodeId || centeredNodeId === 'me';

    if (isViewingMe && zoomLevels.length > 0) {
      // Viewing "Me" - use custom zoom levels
      setMaxZoomIndex(4);

      const validZoomIndex = Math.min(currentZoomIndex, 4);
      const currentLevel = zoomLevels[validZoomIndex];
      if (currentLevel) {
        setCanvasSize(currentLevel.viewSize);
      }
    } else if (!isViewingMe) {
      // Viewing a contact - fit canvas to viewport
      const viewportSize = Math.min(viewportDimensions.width, viewportDimensions.height);
      setCanvasSize(viewportSize);
    }
  }, [zoomLevels, currentZoomIndex, setMaxZoomIndex, setCanvasSize, centeredNodeId, viewportDimensions]);

  // Compute nodes with minZoomLevel assigned based on priority
  // minZoomLevel: 0 = visible at all zoom levels, 4 = only visible at level 0 (zoomed in)
  const nodesWithZoomLevel = useMemo(() => {
    const isViewingMe = !centeredNodeId || centeredNodeId === 'me';

    if (!isViewingMe || zoomLevels.length === 0) {
      // When not viewing Me or no zoom levels, all contacts get minZoomLevel 0
      return nodes.map(node => ({ ...node, minZoomLevel: 0 }));
    }

    const specialNodes = nodes.filter(node =>
      node.type === 'user' || node.type === 'entity' || node.isCentered
    );
    const regularNodes = nodes.filter(node =>
      node.type !== 'user' && node.type !== 'entity' && !node.isCentered
    );

    // Sort regular nodes by priority: centrality first, then MRI
    const sortedNodes = [...regularNodes].sort((a, b) => {
      // Higher centrality = higher priority
      const centralityDiff = (b.centrality ?? 0) - (a.centrality ?? 0);
      if (Math.abs(centralityDiff) > 0.01) return centralityDiff;

      // More recent interaction = higher priority
      const aTime = a.mostRecentInteraction
        ? new Date(a.mostRecentInteraction as string).getTime()
        : 0;
      const bTime = b.mostRecentInteraction
        ? new Date(b.mostRecentInteraction as string).getTime()
        : 0;
      return bTime - aTime;
    });

    // Get max contacts for each level (level 4 has fewest, level 0 has most)
    const levelCounts = zoomLevels.map(z => z.count());

    // Assign minZoomLevel to each contact based on their rank
    // Contacts within level 4's count get minZoomLevel 0 (visible everywhere)
    // Contacts within level 3's count but not level 4's get minZoomLevel 1
    // etc.
    const nodesWithLevel = sortedNodes.map((node, index) => {
      let minZoomLevel = 4; // Default: only visible at level 0

      // Find the highest zoom level (most zoomed out) that includes this contact
      for (let level = 4; level >= 0; level--) {
        if (index < levelCounts[level]) {
          minZoomLevel = 4 - level; // Convert: level 4 → minZoomLevel 0, level 0 → minZoomLevel 4
          break;
        }
      }

      return { ...node, minZoomLevel };
    });

    // Special nodes always visible (minZoomLevel 0)
    const specialWithLevel = specialNodes.map(node => ({ ...node, minZoomLevel: 0 }));

    return [...specialWithLevel, ...nodesWithLevel];
  }, [nodes, zoomLevels, centeredNodeId]);

  // Filter nodes based on current zoom level
  const filteredNodes = useMemo(() => {
    const isViewingMe = !centeredNodeId || centeredNodeId === 'me';

    if (!isViewingMe) {
      // When viewing specific contact/entity, show all nodes
      return nodesWithZoomLevel;
    }

    // At zoom level N, show contacts where minZoomLevel <= (4 - N)
    // Level 0 (zoomed in): show minZoomLevel <= 4 (all)
    // Level 4 (zoomed out): show minZoomLevel <= 0 (only priority)
    const maxMinZoomLevel = 4 - currentZoomIndex;

    return nodesWithZoomLevel.filter(node =>
      (node.minZoomLevel ?? 0) <= maxMinZoomLevel
    );
  }, [nodesWithZoomLevel, currentZoomIndex, centeredNodeId]);

  // Filter edges to only include those where both nodes are visible
  // On main "Me" view, hide edges; on contact-specific view, show them
  const filteredEdges = useMemo(() => {
    const isViewingMe = !centeredNodeId || centeredNodeId === 'me';

    if (isViewingMe) {
      return [];
    }

    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
  }, [edges, filteredNodes, centeredNodeId]);

  useNetworkSimulation(filteredNodes, filteredEdges, canvasSize, canvasSize);

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
    zoomIn();
  };

  const handleZoomOut = () => {
    zoomOut();
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
        • Drag to pan the view
      </DialogContentText>
      <DialogContentText gutterBottom sx={{ mt: 2 }}>
        <strong># Contacts (bottom right):</strong>
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>+</strong> Show more contacts
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>−</strong> Show fewer contacts
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
        • Drag to pan the view
      </DialogContentText>
      <DialogContentText gutterBottom sx={{ mt: 2 }}>
        <strong># Contacts (bottom right):</strong>
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>+</strong> Show more contacts
      </DialogContentText>
      <DialogContentText gutterBottom>
        • <strong>−</strong> Show fewer contacts
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
        width={canvasSize}
        height={canvasSize}
        onNodeClick={handleClick}
        onNodeTouchStart={handleTouchStart}
        onNodeTouchEnd={handleTouchEnd}
        onEdgeClick={handleEdgeClick}
        selectedEdge={selectedEdge}
        onBackgroundClick={handleDismissEdge}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        useStandardZoom={!!(centeredNodeId && centeredNodeId !== 'me')}
      />

      {/* Only show zoom controls when viewing "Me" network */}
      {(!centeredNodeId || centeredNodeId === 'me') && (
        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      )}

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
