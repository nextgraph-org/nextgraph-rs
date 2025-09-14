import type { BlankNode, DefaultGraph, Literal, NamedNode } from "@rdfjs/types";
import type { ObjectNode } from "@ldo/rdf-utils";

export function nodeToString(
  node: NamedNode | BlankNode | DefaultGraph | Literal | null | undefined,
): string {
  if (node == null) {
    return "null";
  }
  switch (node.termType) {
    case "NamedNode":
      return `namedNode(${node.value})`;
    case "BlankNode":
      return `blankNode(${node.value})`;
    case "Literal":
      return `literal(${node.value},${node.datatype.value})`;
    case "DefaultGraph":
      return "defaultGraph()";
  }
}

export class NodeSet {
  private set: Set<string> = new Set();
  private map: Record<string, ObjectNode> = {};

  add(node: ObjectNode) {
    const key = nodeToString(node);
    this.set.add(key);
    this.map[key] = node;
  }

  has(node: ObjectNode): boolean {
    return this.set.has(nodeToString(node));
  }
}
