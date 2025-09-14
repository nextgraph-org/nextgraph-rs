import {
  type ConnectedLdoDataset,
  type ConnectedPlugin,
  type ExpandDeep,
  type LQInput,
  type LQReturn,
} from "@ldo/connected";
import { type LdoBase, type LdoBuilder, type ShapeType } from "@ldo/ldo";
import type { SubjectNode } from "@ldo/rdf-utils";
import { type Readable } from "svelte/store";
import { useTrackingProxy } from "../util/useTrackingProxy.js";
import { onDestroy } from "svelte";

/**
 * @internal
 *
 * Creates a useMatchSubject function.
 */
export function createUseLinkQuery<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
) {
  /**
   * Returns an array of matching linked data objects. Triggers a rerender if
   * the data is updated.
   */
  return function useQueryLink<
    Type extends LdoBase,
    QueryInput extends LQInput<Type>,
  >(
    shapeType: ShapeType<Type>,
    startingResource: string,
    startingSubject: SubjectNode | string,
    linkQuery: QueryInput,
  ): Readable<ExpandDeep<LQReturn<Type, QueryInput>> | undefined> {
    const resource = dataset.getResource(startingResource);
    console.log(resource);
    const lq = dataset
      .usingType(shapeType)
      .startLinkQuery(resource, startingSubject, linkQuery);
    console.log("Calling subscribe");
    lq.subscribe();
    console.log("After call subscribe");

    onDestroy(() => {
      lq.unsubscribeAll();
    });

    const fromSubject = (builder: LdoBuilder<Type>) => {
      if (!startingSubject) return;
      return builder.fromSubject(startingSubject);
    };

    return useTrackingProxy(
      shapeType,
      fromSubject,
      dataset,
    ) as unknown as Readable<ExpandDeep<LQReturn<Type, QueryInput>>>;
  };
}
