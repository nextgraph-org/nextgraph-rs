import type { GraphNode, PredicateNode, SubjectNode } from "@ldo/rdf-utils";
import type { RawObject, RawValue } from "../util/RawObject.js";
import { WildcardObjectSetProxy } from "./WildcardObjectSetProxy.js";
import { addObjectToDataset } from "../util/addObjectToDataset.js";
import type { ProxyContext } from "../ProxyContext.js";

export type ObjectSetProxyQuadMatch = [
  SubjectNode,
  PredicateNode,
  undefined | null,
  GraphNode | undefined | null,
];

export class ObjectSetProxy<
  T extends NonNullable<RawValue>,
> extends WildcardObjectSetProxy<T> {
  protected quadMatch: ObjectSetProxyQuadMatch;

  constructor(
    context: ProxyContext,
    quadMatch: ObjectSetProxyQuadMatch,
    isLangSet?: boolean,
  ) {
    super(context, quadMatch, isLangSet);
    this.quadMatch = quadMatch;
  }

  /**
   * Appends a new element with a specified value to the end of the Set.
   */
  add(value: T): this {
    addObjectToDataset(
      {
        "@id": this.quadMatch[0],
        [this.context.contextUtil.iriToKey(
          this.quadMatch[1].value,
          this.context.getRdfType(this.quadMatch[0]),
        )]: value,
      } as RawObject,
      false,
      this.context,
    );
    return this;
  }

  /**
   * Clears the set of all values
   */
  clear(): void {
    for (const value of this) {
      this.delete(value);
    }
  }

  /**
   * Deletes an item for the set
   * @param value the item to delete
   * @returns true if the item was present before deletion
   */
  delete(value: T): boolean {
    const { dataset } = this.context;
    const quads = this.getQuads(value);
    quads.forEach((quad) => dataset.delete(quad));
    return quads.size > 0;
  }
}
