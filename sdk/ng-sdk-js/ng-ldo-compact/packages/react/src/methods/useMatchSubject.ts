import type { LdoBase, LdSet, ShapeType } from "@ldo/ldo";
import type { QuadMatch } from "@ldo/rdf-utils";
import type { LdoBuilder } from "@ldo/ldo";
import { useCallback } from "react";
import { useTrackingProxy } from "../util/useTrackingProxy.js";
import type {
  ConnectedLdoDataset,
  ConnectedPlugin,
  IConnectedLdoDataset,
} from "@ldo/connected";

export interface UseMatchSubjectOptions<Plugins extends ConnectedPlugin[]> {
  dataset?: IConnectedLdoDataset<Plugins>;
}

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
    options?: UseMatchSubjectOptions<Plugins>,
  ): LdSet<Type> {
    const matchSubject = useCallback(
      (builder: LdoBuilder<Type>) => {
        return builder.matchSubject(predicate, object, graph);
      },
      [predicate, object, graph],
    );

    return useTrackingProxy(
      shapeType,
      matchSubject,
      options?.dataset ?? dataset,
    );
  };
}
