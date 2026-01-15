import { Box, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, useMediaQuery, useTheme, CircularProgress } from '@mui/material';
import {useRef, useState, useMemo, useEffect, useCallback} from 'react';
import { UilInfoCircle } from '@iconscout/react-unicons';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';
import { useNetworkSimulation } from '@/hooks/network/useNetworkSimulation';
import { GraphCanvas } from './GraphCanvas';
import { NavigationTrail, ZoomControls } from '../NetworkControls';
import { computeZoom, ZoomInfo } from '@/hooks/network/computeZoom';
import {GraphNode} from "@/types/network.ts";
import {ShortSocialContact} from "@/.orm/shapes/shortcontact.typings.ts";
import {useNetworkGraph} from "@/hooks/network/useNetworkGraph.ts";

interface NetworkGraphProps {
  backgroundColor?: string;
  contacts: ShortSocialContact[]
}

export const NetworkGraph = ({ backgroundColor = '#F7F3EA', contacts }: NetworkGraphProps) => {
  // Build the network graph from loaded contacts
  useNetworkGraph({ contacts: contacts });

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const {
    nodes,
    currentZoomIndex,
    canvasSize,
    setCanvasSize,
    setMaxZoomIndex,
    zoomIn,
    zoomOut,
    centeredNodeId
  } = useNetworkGraphStore();
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
  }, [nodes.length, currentZoomIndex, centeredNodeId]);

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

    const maxDimension = Math.round(Math.max(viewportDimensions.width, viewportDimensions.height));

    return computeZoom(
      new ZoomInfo(maxDimension, c10, c8, c6, c4, c2)
    );
  }, [nodes, viewportDimensions, centeredNodeId]);

  useEffect(() => {
    const isViewingMe = !centeredNodeId || centeredNodeId === 'me';

    if (isViewingMe && zoomLevels.length > 0) {
      // Viewing "Me" - use custom zoom levels
      setMaxZoomIndex(zoomLevels.length - 1);

      const validZoomIndex = Math.min(currentZoomIndex, zoomLevels.length - 1);
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

  const filteredNodes = useMemo(() => {
    const isViewingMe = !centeredNodeId || centeredNodeId === 'me';

    if (!isViewingMe || zoomLevels.length === 0) {
      // When not viewing Me or no zoom levels, all contacts get minZoomLevel 0
      return nodes;
    }

    const specialNodes = nodes.filter(node =>
      node.type === 'user' || node.type === 'entity' || node.isCentered
    );
    const regularNodes = nodes.filter(node =>
      node.type !== 'user' && node.type !== 'entity' && !node.isCentered
    );
    
    const sortByCentrality = (a: GraphNode, b: GraphNode) => {
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
    };
    
    const c10 = regularNodes.filter(n => (n.centrality ?? 0) >= 0.8).sort(sortByCentrality);
    const c8 = regularNodes.filter(n => (n.centrality ?? 0) >= 0.6 && (n.centrality ?? 0) < 0.8).sort(sortByCentrality);
    const c6 = regularNodes.filter(n => (n.centrality ?? 0) >= 0.4 && (n.centrality ?? 0) < 0.6).sort(sortByCentrality);
    const c4 = regularNodes.filter(n => (n.centrality ?? 0) >= 0.2 && (n.centrality ?? 0) < 0.4).sort(sortByCentrality);
    const c2 = regularNodes.filter(n => (n.centrality ?? 0) < 0.2).sort(sortByCentrality);
    
    const currentLevel = zoomLevels[currentZoomIndex];
    if (currentLevel) {
      const croppedC10 = c10.slice(0, currentLevel.central10);
      const croppedC8 = c8.slice(0, currentLevel.central08);
      const croppedC6 = c6.slice(0, currentLevel.central06);
      const croppedC4 = c4.slice(0, currentLevel.central04);
      const croppedC2 = c2.slice(0, currentLevel.central02);
      return [...specialNodes, ...croppedC10, ...croppedC8, ...croppedC6, ...croppedC4, ... croppedC2];
    }
    
    return [...specialNodes];
  }, [centeredNodeId, zoomLevels, nodes, currentZoomIndex]);

  useNetworkSimulation(filteredNodes, canvasSize, canvasSize, isMobile);

  const handleZoomIn = useCallback(() => {
    zoomIn();
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut();
  }, [zoomOut]);

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
        p: 0,
      }}
    >


      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 5, display: 'flex', gap: 1, alignItems: 'center' }}>
        {isLoading && (
          <CircularProgress size={20} sx={{ color: 'primary.main' }} />
        )}
      </Box>

      <GraphCanvas
        nodes={filteredNodes}
        edges={[]}
        width={canvasSize}
        height={canvasSize}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        useStandardZoom={!!(centeredNodeId && centeredNodeId !== 'me')}
        currentZoomLevel={zoomLevels[currentZoomIndex]}
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
    </Box>
  );
};
