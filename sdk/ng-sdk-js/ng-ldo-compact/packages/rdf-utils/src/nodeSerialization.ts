import type {
  Quad,
  Term,
  BlankNode,
  DefaultGraph,
  Literal,
  NamedNode,
} from "@rdfjs/types";
import {
  termToString,
  quadToStringQuad,
  stringToTerm,
  stringQuadToQuad,
} from "rdf-string";

/**
 * =============================================================================
 * Types
 * =============================================================================
 */

/**
 * Generic type to extract a set of termsTypes for a Term
 */
export type NodeTermTypes<Node extends Term> = Set<Node["termType"]>;

export type SubjectNode = NamedNode | BlankNode;
export const SubjectTermTypes: NodeTermTypes<SubjectNode> = new Set([
  "NamedNode",
  "BlankNode",
]);
export type PredicateNode = NamedNode;
export const PredicateTermTypes: NodeTermTypes<PredicateNode> = new Set([
  "NamedNode",
]);
export type ObjectNode = NamedNode | BlankNode | Literal;
export const ObjectTermTypes: NodeTermTypes<ObjectNode> = new Set([
  "NamedNode",
  "BlankNode",
  "Literal",
]);
export type GraphNode = NamedNode | BlankNode | DefaultGraph;
export const GraphTermTypes: NodeTermTypes<GraphNode> = new Set([
  "NamedNode",
  "BlankNode",
  "DefaultGraph",
]);
export type AnyNode = SubjectNode | PredicateNode | ObjectNode | GraphNode;
export const AnyTermTypes: NodeTermTypes<AnyNode> = new Set([
  "NamedNode",
  "BlankNode",
  "DefaultGraph",
  "Literal",
]);

export interface SimpleQuad extends Quad {
  /**
   * The subject.
   * @see GraphNode
   */
  subject: SubjectNode;
  /**
   * The predicate.
   * @see GraphNode
   */
  predicate: PredicateNode;
  /**
   * The object.
   * @see GraphNode
   */
  object: ObjectNode;
  /**
   * The named graph.
   * @see GraphNode
   */
  graph: GraphNode;
}

export type QuadMatch = [
  SubjectNode | undefined | null,
  PredicateNode | undefined | null,
  ObjectNode | undefined | null,
  GraphNode | undefined | null,
];

/**
 * =============================================================================
 * To String
 * =============================================================================
 */

/**
 * Converts a Subject Node to a String
 * @param node Input Node
 * @returns String Representation
 */
export function subjectNodeToString(node: SubjectNode) {
  return nodeToString(node);
}

/**
 * Converts a Predicate Node to a String
 * @param node Input Node
 * @returns String Representation
 */
export function predicateNodeToString(node: PredicateNode) {
  return nodeToString(node);
}

/**
 * Converts a Object Node to a String
 * @param node Input Node
 * @returns String Representation
 */
export function objectNodeToString(node: ObjectNode) {
  return nodeToString(node);
}

/**
 * Converts a Graph Node to a String
 * @param node Input Node
 * @returns String Representation
 */
export function grpahNodeToString(node: GraphNode) {
  return nodeToString(node);
}

/**
 * Converts a Any Node to a String
 * @param node Input Node
 * @returns String Representation
 */
export function nodeToString(node: AnyNode): string {
  return termToString(node);
}

/**
 * Converts a Quad to a String
 * @param node Input Quad
 * @returns String Representation
 */
export function quadToString(quad: Quad): string {
  return JSON.stringify(quadToStringQuad(quad));
}

/**
 * Converts a Quad Match to a String
 * @param node Input Quad
 * @returns String Representation
 */
export function quadMatchToString(quadMatch: QuadMatch): string {
  return JSON.stringify({
    subject: quadMatch[0] ? subjectNodeToString(quadMatch[0]) : undefined,
    predicate: quadMatch[1] ? predicateNodeToString(quadMatch[1]) : undefined,
    object: quadMatch[2] ? objectNodeToString(quadMatch[2]) : undefined,
    graph: quadMatch[3] ? grpahNodeToString(quadMatch[3]) : undefined,
  });
}

/**
 * =============================================================================
 * From String
 * =============================================================================
 */

/**
 * Converts a String to a Subject Node
 * @param input String Inupt
 * @returns Node
 */
export function stringToSubjectNode(input: string): SubjectNode {
  return stringToNode(input, SubjectTermTypes) as SubjectNode;
}

/**
 * Converts a String to a Predicate Node
 * @param input String Inupt
 * @returns Node
 */
export function stringToPredicateNode(input: string): PredicateNode {
  return stringToNode(input, PredicateTermTypes) as PredicateNode;
}

/**
 * Converts a String to an Object Node
 * @param input String Inupt
 * @returns Node
 */
export function stringToObjectNode(input: string): ObjectNode {
  return stringToNode(input, ObjectTermTypes) as ObjectNode;
}

/**
 * Converts a String to a Graph Node
 * @param input String Inupt
 * @returns Node
 */
export function stringToGraphNode(input: string): GraphNode {
  return stringToNode(input, GraphTermTypes) as GraphNode;
}

/**
 * Converts a String to a Node
 * @param input String Inupt
 * @returns Node
 */
export function stringToNode(
  input: string,
  expectTermType?: NodeTermTypes<Term>,
): AnyNode {
  const node = stringToTerm(input);
  if (expectTermType && !expectTermType.has(node.termType)) {
    throw new Error(
      `Expected term to be one of term type: [${Array.from(
        expectTermType,
      ).reduce((agg, termType) => `${agg}${termType}, `, "")}], but got ${
        node.termType
      }.`,
    );
  }
  return node as AnyNode;
}

/**
 * Converts a String to a Quad
 * @param input String Inupt
 * @returns Quad
 */
export function stringToQuad(input: string) {
  try {
    return stringQuadToQuad(JSON.parse(input));
  } catch (err) {
    throw new Error("Invalid Quad String");
  }
}

/**
 * Converts a String to a Quad Match
 * @param input String Inupt
 * @returns QuadMatch
 */
export function stringToQuadMatch(input: string): QuadMatch {
  try {
    const jsonRep = JSON.parse(input);
    return [
      jsonRep.subject != undefined
        ? stringToSubjectNode(jsonRep.subject)
        : undefined,
      jsonRep.predicate != undefined
        ? stringToPredicateNode(jsonRep.predicate)
        : undefined,
      jsonRep.object != undefined
        ? stringToObjectNode(jsonRep.object)
        : undefined,
      jsonRep.graph != undefined ? stringToGraphNode(jsonRep.graph) : undefined,
    ];
  } catch (err) {
    throw new Error("Invalid Quad Match String");
  }
}
