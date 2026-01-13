import {useTheme} from '@mui/material';
import {GraphNode} from '@/types/network';
import {useCallback} from "react";

function wrapText(text: string, maxChars: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface GraphLabelsProps {
  nodes: GraphNode[];
  zoomLevel?: number;
}

export const GraphLabels = ({nodes}: GraphLabelsProps) => {
  const theme = useTheme();

  const calculateLabelPosition = useCallback((node: GraphNode) => {
    if (!node.x || !node.y) return {x: 0, y: 0};

    if (node.isCentered) {
      const nodeSize = 40;
      return {
        x: node.x + nodeSize / 2 + 6,
        y: node.y,
      };
    }

    if (node.priority === 'low') {
      return {x: node.x, y: node.y};
    }

    const nodeSize = 30;
    return {
      x: node.x,
      y: node.y + nodeSize / 2 + 12,
    };
  }, []);

  return (
    <g className="labels">
      {nodes
        .filter((node) => node.priority !== 'low' && node.x && node.y)
        .map((node) => {
          const pos = calculateLabelPosition(node);

          if (node.name === "ME") {
            return;
          }

          const lines = wrapText(node.name, 14);

          return <text
            x={pos.x}
            y={pos.y}
            textAnchor={node.isCentered ? 'start' : 'middle'}
            fill={theme.palette.text.primary}
            fontSize={node.isCentered ? 16 : 12}
            fontWeight={node.isCentered ? 700 : 500}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {lines.map((line, i) => (
              <tspan
                key={"line_" + node.id + i}
                x={pos.x}
                dy={i === 0 ? 0 : '1.2em'}
              >
                {line}
              </tspan>
            ))}
          </text>
        })}
    </g>
  );
};
