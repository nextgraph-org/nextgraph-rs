import { createDataset } from "@ldo/dataset";
import type { GraphNode, DatasetChanges } from "@ldo/rdf-utils";
import type { Quad } from "@rdfjs/types";
import { defaultGraph, namedNode, quad as createQuad } from "@ldo/rdf-utils";

/**
 * @internal
 * Converts an RDFJS Graph Node to a string hash
 * @param graphNode - the node to convert
 * @returns a unique string corresponding to the node
 */
export function graphNodeToString(graphNode: GraphNode): string {
  return graphNode.termType === "DefaultGraph"
    ? "defaultGraph()"
    : graphNode.value;
}

/**
 * @internal
 * Converts a unique string to a GraphNode
 * @param input - the unique string
 * @returns A graph node
 */
export function stringToGraphNode(input: string): GraphNode {
  return input === "defaultGraph()" ? defaultGraph() : namedNode(input);
}

/**
 * Splits all changes in a DatasetChanges into individual DatasetChanges grouped
 * by the quad graph.
 * @param changes - Changes to split
 * @returns A map between the quad graph and the changes associated with that
 * graph
 */
export function splitChangesByGraph(
  changes: DatasetChanges<Quad>,
): Map<GraphNode, DatasetChanges<Quad>> {
  const changesMap: Record<string, DatasetChanges<Quad>> = {};
  changes.added?.forEach((quad) => {
    const graphHash = graphNodeToString(quad.graph as GraphNode);
    if (!changesMap[graphHash]) {
      changesMap[graphHash] = {};
    }
    if (!changesMap[graphHash].added) {
      changesMap[graphHash].added = createDataset();
    }
    changesMap[graphHash].added?.add(
      createQuad(quad.subject, quad.predicate, quad.object, quad.graph),
    );
  });

  changes.removed?.forEach((quad) => {
    const graphHash = graphNodeToString(quad.graph as GraphNode);
    if (!changesMap[graphHash]) {
      changesMap[graphHash] = {};
    }
    if (!changesMap[graphHash].removed) {
      changesMap[graphHash].removed = createDataset();
    }
    changesMap[graphHash].removed?.add(
      createQuad(quad.subject, quad.predicate, quad.object, quad.graph),
    );
  });

  const finalMap = new Map<GraphNode, DatasetChanges<Quad>>();
  Object.entries(changesMap).forEach(([key, value]) => {
    finalMap.set(stringToGraphNode(key), value);
  });
  return finalMap;
}
