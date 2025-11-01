import { useMemo } from 'react';
import { GraphNode } from '@/types/network';

interface LabelPosition {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
}

const COLLISION_RADIUS = 60;
const LABEL_OFFSET = 15;

const hasCollision = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number
): boolean => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < radius;
};

export const useLabelPositioning = (nodes: GraphNode[]): Map<string, LabelPosition> => {
  return useMemo(() => {
    const positions = new Map<string, LabelPosition>();

    nodes.forEach((node) => {
      if (!node.x || !node.y) return;

      if (node.isCentered) {
        positions.set(node.id, {
          x: node.x + 50,
          y: node.y,
          anchor: 'start',
        });
        return;
      }

      if (node.priority === 'low') {
        positions.set(node.id, {
          x: node.x,
          y: node.y,
          anchor: 'middle',
        });
        return;
      }

      let labelX = node.x;
      let labelY = node.y - LABEL_OFFSET - 20;
      let anchor: 'start' | 'middle' | 'end' = 'middle';

      const nearbyNodes = nodes.filter((other) => {
        if (other.id === node.id || !other.x || !other.y) return false;
        return hasCollision(node.x!, node.y!, other.x, other.y, COLLISION_RADIUS * 2);
      });

      if (nearbyNodes.length > 0) {
        const angles = [
          { angle: -90, x: 0, y: -LABEL_OFFSET - 20, anchor: 'middle' as const },
          { angle: -45, x: LABEL_OFFSET + 10, y: -LABEL_OFFSET - 10, anchor: 'start' as const },
          { angle: 0, x: LABEL_OFFSET + 20, y: 0, anchor: 'start' as const },
          { angle: 45, x: LABEL_OFFSET + 10, y: LABEL_OFFSET + 10, anchor: 'start' as const },
          { angle: 90, x: 0, y: LABEL_OFFSET + 20, anchor: 'middle' as const },
          { angle: 135, x: -LABEL_OFFSET - 10, y: LABEL_OFFSET + 10, anchor: 'end' as const },
          { angle: 180, x: -LABEL_OFFSET - 20, y: 0, anchor: 'end' as const },
          { angle: -135, x: -LABEL_OFFSET - 10, y: -LABEL_OFFSET - 10, anchor: 'end' as const },
        ];

        let minCollisions = Infinity;
        let bestPosition = angles[0];

        angles.forEach((position) => {
          const testX = node.x! + position.x;
          const testY = node.y! + position.y;

          const collisions = nearbyNodes.filter((other) =>
            hasCollision(testX, testY, other.x!, other.y!, COLLISION_RADIUS)
          ).length;

          if (collisions < minCollisions) {
            minCollisions = collisions;
            bestPosition = position;
          }
        });

        labelX = node.x + bestPosition.x;
        labelY = node.y + bestPosition.y;
        anchor = bestPosition.anchor;
      }

      positions.set(node.id, { x: labelX, y: labelY, anchor });
    });

    return positions;
  }, [nodes]);
};
