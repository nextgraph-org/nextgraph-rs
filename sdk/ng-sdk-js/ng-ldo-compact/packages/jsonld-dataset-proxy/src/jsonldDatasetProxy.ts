import { defaultGraph } from "@ldo/rdf-utils";
import type { Dataset } from "@rdfjs/types";
import type { ContextDefinition } from "jsonld";
import { ContextUtil } from "./ContextUtil.js";
import { JsonldDatasetProxyBuilder } from "./JsonldDatasetProxyBuilder.js";
import { ProxyContext } from "./ProxyContext.js";
import type { LdoJsonldContext } from "./LdoJsonldContext.js";

/**
 * Creates a JSON-LD Dataset Proxy
 *
 * @param inputDataset the source dataset
 * @param context JSON-LD Context
 * @returns a JSON-LD Dataset proxy
 */
export function jsonldDatasetProxy(
  inputDataset: Dataset,
  context: ContextDefinition | LdoJsonldContext,
): JsonldDatasetProxyBuilder {
  const contextUtil = new ContextUtil(context);
  const proxyContext = new ProxyContext({
    dataset: inputDataset,
    contextUtil,
    writeGraphs: [defaultGraph()],
    languageOrdering: ["none", "en", "other"],
  });
  return new JsonldDatasetProxyBuilder(proxyContext);
}
