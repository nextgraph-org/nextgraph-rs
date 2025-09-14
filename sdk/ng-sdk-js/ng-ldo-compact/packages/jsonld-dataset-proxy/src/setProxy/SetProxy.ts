/**
 * This file handles the underlying functionality of a set, including hidden
 * helper methods
 */
import type { Dataset, Quad } from "@rdfjs/types";
import type {
  GraphNode,
  ObjectNode,
  QuadMatch,
  SubjectNode,
} from "@ldo/rdf-utils";
import {
  _isSubjectOriented,
  _getUnderlyingDataset,
  _proxyContext,
  _isLangString,
  _getUnderlyingMatch,
  _getUnderlyingNode,
  _writeGraphs,
} from "../types.js";
import type { ProxyContext } from "../ProxyContext.js";
import type { RawValue } from "../util/RawObject.js";
import { nodeToJsonldRepresentation } from "../util/nodeToJsonldRepresentation.js";
import { BasicLdSet } from "./ldSet/BasicLdSet.js";

/**
 * A Set Proxy represents a set of items in a dataset and is a proxy for
 * accessing those items in the dataset.
 */
export abstract class SetProxy<
  T extends NonNullable<RawValue> = NonNullable<RawValue>,
> extends BasicLdSet<T> {
  protected quadMatch: QuadMatch;
  protected context: ProxyContext;

  constructor(context: ProxyContext, quadMatch: QuadMatch) {
    super();
    this.context = context;
    this.quadMatch = quadMatch;
  }

  /**
   * Gets the subject, predicate and object for this set
   */
  protected abstract getQuads(value?: T): Dataset<Quad, Quad>;

  protected abstract getNodeOfFocus(quad: Quad): SubjectNode | ObjectNode;

  /**
   * The add method on a wildcard set does nothing.
   * @deprecated You cannot add data to a wildcard set as it is simply a proxy to an underlying dataset
   */
  add(_value: T) {
    console.warn(
      'You\'ve attempted to call "add" on a wildcard set. You cannot add data to a wildcard set as it is simply a proxy to an underlying dataset',
    );
    return this;
  }

  /**
   * The clear method on an abstract set does nothing.
   * @deprecated You cannot clear data from an abstract set as it is simply a proxy to an underlying dataset
   */
  clear(): void {
    console.warn(
      'You\'ve attempted to call "clear" on an abstract set. You cannot clear data from an abstract set as it is simply a proxy to an underlying dataset',
    );
    return;
  }

  /**
   * The delete method on an abstract set does nothing.
   * @deprecated You cannot delete data from an abstract set as it is simply a proxy to an underlying dataset
   */
  delete(_value: T): boolean {
    console.warn(
      'You\'ve attempted to call "clear" on an abstract set. You cannot delete data from an abstract set as it is simply a proxy to an underlying dataset',
    );
    return false;
  }

  has(value: T): boolean {
    return this.getQuads(value).size > 0;
  }

  get size() {
    return this.getQuads().size;
  }

  entries(): IterableIterator<[T, T]> {
    const iteratorSet = new Set<[T, T]>();
    for (const value of this) {
      iteratorSet.add([value, value]);
    }
    return iteratorSet[Symbol.iterator]();
  }

  keys(): IterableIterator<T> {
    return this.values();
  }

  values(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<T> {
    const quads = this.getQuads();
    const collection: T[] = quads.toArray().map((quad) => {
      const quadSubject = this.getNodeOfFocus(quad);
      return nodeToJsonldRepresentation(quadSubject, this.context) as T;
    });
    return new Set(collection)[Symbol.iterator]();
  }

  get [Symbol.toStringTag]() {
    // TODO: Change this to be human readable.
    return "LdSet";
  }

  get [_getUnderlyingDataset](): Dataset {
    return this.context.dataset;
  }

  get [_getUnderlyingMatch](): QuadMatch {
    return this.quadMatch;
  }

  get [_proxyContext](): ProxyContext {
    return this.context;
  }

  set [_proxyContext](newContext: ProxyContext) {
    this.context = newContext;
  }

  get [_writeGraphs](): GraphNode[] {
    return this.context.writeGraphs;
  }

  abstract get [_isSubjectOriented](): boolean;
}
