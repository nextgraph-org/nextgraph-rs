import { useCallback, useRef } from 'react';

interface UseNodeInteractionOptions {
  onNodeClick?: (nodeId: string) => void;
  onNodeLongPress?: (nodeId: string) => void;
  longPressDuration?: number;
}

export const useNodeInteraction = ({
  onNodeClick,
  onNodeLongPress,
  longPressDuration = 500,
}: UseNodeInteractionOptions) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = useCallback(
    (nodeId: string) => {
      longPressTriggered.current = false;

      if (onNodeLongPress) {
        longPressTimer.current = setTimeout(() => {
          longPressTriggered.current = true;
          onNodeLongPress(nodeId);
        }, longPressDuration);
      }
    },
    [onNodeLongPress, longPressDuration]
  );

  const handleTouchEnd = useCallback(
    (nodeId: string) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (!longPressTriggered.current && onNodeClick) {
        onNodeClick(nodeId);
      }

      longPressTriggered.current = false;
    },
    [onNodeClick]
  );

  const handleClick = useCallback(
    (nodeId: string) => {
      if (onNodeClick) {
        onNodeClick(nodeId);
      }
    },
    [onNodeClick]
  );

  return {
    handleClick,
    handleTouchStart,
    handleTouchEnd,
  };
};
