import type { SubjectNode } from "@ldo/rdf-utils";
import type { ShapeType } from "@ldo/ldo";
import type { LdoBuilder } from "@ldo/ldo";
import type { LdoBase } from "@ldo/ldo";
import { useCallback } from "react";

import { useTrackingProxy } from "../util/useTrackingProxy.js";
import type {
  ConnectedLdoDataset,
  ConnectedPlugin,
  IConnectedLdoDataset,
} from "@ldo/connected";

export interface UseSubjectOptions<Plugins extends ConnectedPlugin[]> {
  dataset?: IConnectedLdoDataset<Plugins>;
}

export type useSubjectType<Plugins extends ConnectedPlugin[]> = {
  <Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject: string | SubjectNode,
    options?: UseSubjectOptions<Plugins>,
  ): Type;
  <Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: string | SubjectNode,
    options?: UseSubjectOptions<Plugins>,
  ): Type | undefined;
  <Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: string | SubjectNode,
    options?: UseSubjectOptions<Plugins>,
  ): Type | undefined;
};

/**
 * @internal
 *
 * Creates a useSubject function.
 */
export function createUseSubject<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
): useSubjectType<Plugins> {
  /**
   * Returns a Linked Data Object based on the provided subject. Triggers a
   * rerender if the data is udpated.
   */
  return function useSubject<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: string | SubjectNode,
    options?: UseSubjectOptions<Plugins>,
  ): Type | undefined {
    const fromSubject = useCallback(
      (builder: LdoBuilder<Type>) => {
        if (!subject) return;
        return builder.fromSubject(subject);
      },
      [subject],
    );

    return useTrackingProxy(
      shapeType,
      fromSubject,
      options?.dataset ?? dataset,
    );
  };
}
