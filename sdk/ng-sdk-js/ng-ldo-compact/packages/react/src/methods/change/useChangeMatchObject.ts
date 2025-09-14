import { useCallback, useMemo } from "react";
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import { createUseChangeDataset } from "./useChangeDataset.js";
import { write, type LdoBase, type LdSet, type ShapeType } from "@ldo/ldo";
import type { QuadMatch } from "@ldo/rdf-utils";
import type { UseMatchObjectOptions } from "../useMatchObject.js";
import { createUseMatchObject } from "../useMatchObject.js";
import type { useChangeReturn, useChangeSetData } from "./types.js";
import { createProxyInteractOptions } from "@ldo/jsonld-dataset-proxy";

/**
 * @internal
 *
 * Creates a useChangeMatchObject function
 */
export function createUseChangeMatchObject<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
) {
  const useChangeDataset = createUseChangeDataset(dataset);
  const useMatchObject = createUseMatchObject(dataset);

  /**
   * Returns a list of matched objects that can be modified and committed
   */
  return function useChangeMatchObject<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: QuadMatch[0] | string,
    predicate?: QuadMatch[1] | string,
    graph?: QuadMatch[3] | string,
    options?: UseMatchObjectOptions<Plugins>,
  ): useChangeReturn<LdSet<Type>, Plugins> {
    const [transactionDataset, setDataset, commitData] = useChangeDataset(
      options?.dataset,
    );

    const ldObject = useMatchObject(shapeType, subject, predicate, graph, {
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
                .matchObject(subject, predicate, graph);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          changer(ldObject);
        });
      },
      [setDataset, subject, predicate, graph, shapeType],
    );

    return useMemo(
      () => [ldObject, setData, commitData, transactionDataset],
      [ldObject, setData, commitData, transactionDataset],
    );
  };
}
