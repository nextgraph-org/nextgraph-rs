import type { SubjectNode } from "@ldo/rdf-utils";
import type { ShapeType } from "@ldo/ldo";
import type { LdoBuilder } from "@ldo/ldo";
import type { LdoBase } from "@ldo/ldo";

import { useTrackingProxy } from "../util/useTrackingProxy.js";
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import type { Readable } from "svelte/store";

export type useSubjectType = {
  <Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject: string | SubjectNode,
  ): Readable<Type>;
  <Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: string | SubjectNode,
  ): Readable<Type | undefined>;
  <Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: string | SubjectNode,
  ): Readable<Type | undefined>;
};

/**
 * @internal
 *
 * Creates a useSubject function.
 */
export function createUseSubject<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
): useSubjectType {
  /**
   * Returns a Linked Data Object based on the provided subject. Triggers a
   * rerender if the data is udpated.
   */
  return function useSubject<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject?: string | SubjectNode,
  ): Readable<Type | undefined> {
    const fromSubject = (builder: LdoBuilder<Type>) => {
      if (!subject) return;
      return builder.fromSubject(subject);
    };

    return useTrackingProxy(shapeType, fromSubject, dataset);
  };
}
