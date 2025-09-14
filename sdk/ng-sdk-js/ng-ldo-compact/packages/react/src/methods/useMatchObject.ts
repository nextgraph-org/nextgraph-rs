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

export interface UseMatchObjectOptions<Plugins extends ConnectedPlugin[]> {
  dataset?: IConnectedLdoDataset<Plugins>;
}

/**
 * @internal
 *
 * Creates a useMatchObject function
 */
export function createUseMatchObject<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
) {
  /**
   * Returns an array of matching items and triggers a rerender when that data
   * is updated.
   */
  return function useMatchObject<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: QuadMatch[0] | string,
    predicate?: QuadMatch[1] | string,
    graph?: QuadMatch[3] | string,
    options?: UseMatchObjectOptions<Plugins>,
  ): LdSet<Type> {
    const matchObject = useCallback(
      (builder: LdoBuilder<Type>) => {
        return builder.matchObject(subject, predicate, graph);
      },
      [subject, predicate, graph],
    );

    return useTrackingProxy(
      shapeType,
      matchObject,
      options?.dataset ?? dataset,
    );
  };
}
