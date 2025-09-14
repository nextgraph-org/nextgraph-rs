import { useCallback, useMemo } from "react";
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import { createUseChangeDataset } from "./useChangeDataset.js";
import { write, type LdoBase, type LdSet, type ShapeType } from "@ldo/ldo";
import type { QuadMatch } from "@ldo/rdf-utils";
import type { useChangeReturn, useChangeSetData } from "./types.js";
import {
  createUseMatchSubject,
  type UseMatchSubjectOptions,
} from "../useMatchSubject.js";
import { createProxyInteractOptions } from "@ldo/jsonld-dataset-proxy";

/**
 * @internal
 *
 * Creates a useChangeMatchSubject function
 */
export function createUseChangeMatchSubject<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
) {
  const useChangeDataset = createUseChangeDataset(dataset);
  const useMatchSubject = createUseMatchSubject(dataset);

  /**
   * Returns a list of matched subjects that can be modified and committed
   */
  return function useChangeMatchSubject<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    predicate?: QuadMatch[1] | string,
    object?: QuadMatch[2] | string,
    graph?: QuadMatch[3] | string,
    options?: UseMatchSubjectOptions<Plugins>,
  ): useChangeReturn<LdSet<Type>, Plugins> {
    const [transactionDataset, setDataset, commitData] = useChangeDataset(
      options?.dataset,
    );

    const ldObject = useMatchSubject(shapeType, predicate, object, graph, {
      dataset: transactionDataset,
    });

    const setData = useCallback<useChangeSetData<Type, Plugins>>(
      (writeResource, changer, otherType?) => {
        setDataset((dataset) => {
          const ldObject = otherType
            ? write(writeResource.uri).usingCopy(
                createProxyInteractOptions("dataset", dataset).usingCopy(
                  otherType,
                )[0],
              )[0]
            : dataset
                .usingType(shapeType)
                .write(writeResource.uri)
                .matchSubject(predicate, object, graph);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          changer(ldObject);
        });
      },
      [setDataset, predicate, object, graph, shapeType],
    );

    return useMemo(
      () => [ldObject, setData, commitData, transactionDataset],
      [ldObject, setData, commitData, transactionDataset],
    );
  };
}
