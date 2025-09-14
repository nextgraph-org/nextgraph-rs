import type { LdoBase, LdoBuilder, LdSet, ShapeType } from "@ldo/ldo";
import type { QuadMatch } from "@ldo/rdf-utils";
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import { useTrackingProxy } from "../util/useTrackingProxy.js";
import type { Readable } from "svelte/store";

/**
 * @internal
 *
 * Creates a useMatchSubject function.
 */
export function createUseMatchSubject<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
) {
  /**
   * Returns an array of matching linked data objects. Triggers a rerender if
   * the data is updated.
   */
  return function useMatchSubject<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    predicate?: QuadMatch[1] | string,
    object?: QuadMatch[2] | string,
    graph?: QuadMatch[3] | string,
  ): Readable<LdSet<Type>> {
    const matchSubject = (builder: LdoBuilder<Type>) => {
      return builder.matchSubject(predicate, object, graph);
    };

    return useTrackingProxy(shapeType, matchSubject, dataset);
  };
}
