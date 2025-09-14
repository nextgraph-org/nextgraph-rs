import {
  ContextUtil,
  JsonldDatasetProxyBuilder,
} from "@ldo/jsonld-dataset-proxy";
import { LdoBuilder } from "@ldo/ldo";
import type { LdoBase, LdoDataset, ShapeType } from "@ldo/ldo";
import { TrackingProxyContext } from "./TrackingProxyContext.js";
import { defaultGraph } from "@ldo/rdf-utils";
import type { nodeEventListener } from "@ldo/subscribable-dataset";
import type { Quad } from "@rdfjs/types";

/**
 * @internal
 * Creates a Linked Data Object builder that when creating linked data objects
 * it tracks when something that was read from it is updated and triggers some
 * action based on that.
 */
export function createTrackingProxyBuilder<Type extends LdoBase>(
  dataset: LdoDataset,
  shapeType: ShapeType<Type>,
  onUpdate: nodeEventListener<Quad>,
): LdoBuilder<Type> {
  // Remove all current subscriptions
  // dataset.removeListenerFromAllEvents(onUpdate);

  // Rebuild the LdoBuilder from scratch to inject TrackingProxyContext
  const contextUtil = new ContextUtil(shapeType.context);
  const proxyContext = new TrackingProxyContext(
    {
      dataset,
      contextUtil,
      writeGraphs: [defaultGraph()],
      languageOrdering: ["none", "en", "other"],
    },
    onUpdate,
  );
  const builder = new LdoBuilder(
    new JsonldDatasetProxyBuilder(proxyContext),
    shapeType,
  );
  return builder;
}
