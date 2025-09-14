import { namedNode } from "@ldo/rdf-utils";
import type { Dataset, Quad } from "@rdfjs/types";
import type { SetProxy, SubjectProxy } from "@ldo/jsonld-dataset-proxy";
import {
  getProxyFromObject,
  _getUnderlyingDataset,
  _proxyContext,
} from "@ldo/jsonld-dataset-proxy";
import type { AnyNode } from "@ldo/rdf-utils";
import type {
  ISubscribableDataset,
  ITransactionDataset,
} from "@ldo/subscribable-dataset";

/**
 * @category Types
 * `LdoBase` is an interface defining that a Linked Data Object is a JavaScript Object Literal.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LdoBase = Record<string, any>;

/**
 * @category Types
 * `LdoCompactBase` is an interface defining that a Linked Data Object
 * in compact format is a JavaScript Object Literal and has an id.
 */
export type LdoCompactBase = LdoBase & { id: string };

/**
 * Converts a node/string into just a node
 * @param input A Node or string
 * @returns A node
 */
export function normalizeNodeName<NodeType extends AnyNode>(
  input: NodeType | string,
): NodeType {
  return (typeof input === "string" ? namedNode(input) : input) as NodeType;
}

/**
 * Converts an array of nodes/strings into an array of nodes
 * @param inputs An array of nodes/strings
 * @returns An array of nodes
 */
export function normalizeNodeNames<NodeType extends AnyNode>(
  inputs: (NodeType | string)[],
): NodeType[] {
  return inputs.map((input) => normalizeNodeName<NodeType>(input));
}

export function canDatasetStartTransaction(
  dataset: Dataset,
): dataset is ISubscribableDataset<Quad> {
  return (
    typeof (dataset as ISubscribableDataset).startTransaction === "function"
  );
}

export function isTransactionalDataset(
  dataset: Dataset,
): dataset is ITransactionDataset<Quad> {
  return typeof (dataset as ITransactionDataset).commit === "function";
}

export function getTransactionalDatasetFromLdo(
  ldo: LdoBase,
): [ITransactionDataset<Quad>, SubjectProxy | SetProxy] {
  const proxy = getProxyFromObject(ldo);
  const dataset = proxy[_getUnderlyingDataset];
  if (
    !isTransactionalDataset(dataset) ||
    !proxy[_proxyContext].state.parentDataset
  ) {
    throw new Error("Object is not currently in a transaction");
  }
  return [dataset, proxy];
}
