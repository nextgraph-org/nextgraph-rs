import type { GraphNode } from "@ldo/rdf-utils";
import type { BlankNode, Dataset, NamedNode } from "@rdfjs/types";
import type { ContextDefinition } from "jsonld";
import type { ProxyContext } from "../ProxyContext.js";
import type {
  _getUnderlyingDataset,
  _getUnderlyingNode,
  _proxyContext,
  _writeGraphs,
} from "../types.js";

export type SubjectProxy = {
  "@id"?: string;
  "@context": ContextDefinition;
  [key: string | number | symbol]: unknown;
  readonly [_getUnderlyingDataset]: Dataset;
  readonly [_getUnderlyingNode]: NamedNode | BlankNode;
  [_proxyContext]: ProxyContext;
  readonly [_writeGraphs]: GraphNode[];
};
