import type {
  ProxyContextOptions,
  SubjectProxy,
  SetProxy,
} from "@ldo/jsonld-dataset-proxy";
import { ProxyContext } from "@ldo/jsonld-dataset-proxy";
import type { QuadMatch } from "@ldo/rdf-utils";
import type {
  nodeEventListener,
  SubscribableDataset,
} from "@ldo/subscribable-dataset";
import type { BlankNode, NamedNode, Quad } from "@rdfjs/types";
import { createTrackingSubjectProxy } from "./TrackingSubjectProxy.js";
import { createTrackingSetProxy } from "./TrackingSetProxy.js";

/**
 * @internal
 * Options to be passed to the tracking proxy
 */
export interface TrackingProxyContextOptions extends ProxyContextOptions {
  dataset: SubscribableDataset<Quad>;
}

/**
 * @internal
 * A listener that gets triggered whenever there's an update
 */

/**
 * @internal
 * This proxy exists to ensure react components rerender at the right time. It
 * keeps track of every key accessed in a Linked Data Object and only when the
 * dataset is updated with that key does it rerender the react component.
 */
export class TrackingProxyContext extends ProxyContext {
  private listener: nodeEventListener<Quad>;
  private subscribableDataset: SubscribableDataset<Quad>;

  constructor(
    options: TrackingProxyContextOptions,
    listener: nodeEventListener<Quad>,
  ) {
    super(options);
    this.subscribableDataset = options.dataset;
    this.listener = listener;
  }

  // Adds the listener to the subscribable dataset while ensuring deduping of the listener
  public addListener(eventName: QuadMatch) {
    const listeners = this.subscribableDataset.listeners(eventName);
    if (!listeners.includes(this.listener)) {
      this.subscribableDataset.on(eventName, this.listener);
    }
  }

  protected createNewSubjectProxy(node: NamedNode | BlankNode): SubjectProxy {
    return createTrackingSubjectProxy(this, node);
  }

  protected createNewSetProxy(
    quadMatch: QuadMatch,
    isSubjectOriented?: boolean,
    isLangStringSet?: boolean,
  ): SetProxy {
    return createTrackingSetProxy(
      this,
      quadMatch,
      isSubjectOriented,
      isLangStringSet,
    );
  }
}
