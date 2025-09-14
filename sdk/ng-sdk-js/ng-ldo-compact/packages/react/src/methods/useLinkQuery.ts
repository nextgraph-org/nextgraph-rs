import type {
  ConnectedLdoDataset,
  ConnectedPlugin,
  ExpandDeep,
  LQInput,
  LQReturn,
  ResourceLinkQuery,
} from "@ldo/connected";
import type { LdoBase, LdoBuilder, ShapeType } from "@ldo/ldo";
import type { SubjectNode } from "@ldo/rdf-utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTrackingProxy } from "../util/useTrackingProxy.js";

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
  ): ExpandDeep<LQReturn<Type, QueryInput>> | undefined {
    const linkQueryRef = useRef<
      ResourceLinkQuery<Type, QueryInput, Plugins> | undefined
    >();

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      if (linkQueryRef.current) {
        linkQueryRef.current.unsubscribeAll();
      }
      const resource = dataset.getResource(startingResource);
      setIsLoading(true);
      linkQueryRef.current = dataset
        .usingType(shapeType)
        .startLinkQuery(resource, startingSubject, linkQuery);

      linkQueryRef.current.subscribe().then(() => setIsLoading(false));

      return () => {
        linkQueryRef.current?.unsubscribeAll();
      };
    }, [shapeType, startingResource, startingSubject, linkQuery]);

    const fromSubject = useCallback(
      (builder: LdoBuilder<Type>) => {
        if (!startingSubject) return;
        return builder.fromSubject(startingSubject);
      },
      [startingSubject],
    );

    const linkedDataObject = useTrackingProxy(shapeType, fromSubject, dataset);

    return isLoading
      ? undefined
      : (linkedDataObject as unknown as ExpandDeep<LQReturn<Type, QueryInput>>);
  };
}
