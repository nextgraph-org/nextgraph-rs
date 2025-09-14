import { useCallback, useMemo } from "react";
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import { createUseChangeDataset } from "./useChangeDataset.js";
import type { UseSubjectOptions } from "../useSubject.js";
import { createUseSubject } from "../useSubject.js";
import { write, type LdoBase, type ShapeType } from "@ldo/ldo";
import type { SubjectNode } from "@ldo/rdf-utils";
import type { useChangeReturn, useChangeSetData } from "./types.js";
import { createProxyInteractOptions } from "@ldo/jsonld-dataset-proxy";

export type useChangeSubjectType<Plugins extends ConnectedPlugin[]> = {
  <Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject: string | SubjectNode,
    options?: UseSubjectOptions<Plugins>,
  ): useChangeReturn<Type, Plugins>;
  <Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: string | SubjectNode,
    options?: UseSubjectOptions<Plugins>,
  ): useChangeReturn<Type | undefined, Plugins>;
  <Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: string | SubjectNode,
    options?: UseSubjectOptions<Plugins>,
  ): useChangeReturn<Type | undefined, Plugins>;
};

/**
 * @internal
 *
 * Creates a useChangeSubject function
 */
export function createUseChangeSubject<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
): useChangeSubjectType<Plugins> {
  const useChangeDataset = createUseChangeDataset(dataset);
  const useSubject = createUseSubject(dataset);

  /**
   * Returns a subject that can be modified and committed
   */
  return function useChangeSubject<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: string | SubjectNode,
    options?: UseSubjectOptions<Plugins>,
  ): useChangeReturn<Type | undefined, Plugins> {
    const [transactionDataset, setDataset, commitData] = useChangeDataset(
      options?.dataset,
    );

    const ldObject = useSubject(shapeType, subject, {
      dataset: transactionDataset,
    });

    const setData = useCallback<useChangeSetData<Type, Plugins>>(
      (writeResource, changer, otherType?) => {
        if (!subject) return;
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
                .fromSubject(subject);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          changer(ldObject);
        });
      },
      [setDataset, subject, shapeType],
    );

    return useMemo(
      () => [ldObject, setData, commitData, transactionDataset],
      [ldObject, setData, commitData, transactionDataset],
    );
  };
}
