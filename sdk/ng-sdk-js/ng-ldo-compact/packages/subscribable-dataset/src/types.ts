import type { DatasetChanges, QuadMatch } from "@ldo/rdf-utils";
import type { Dataset, BaseQuad, DatasetFactory } from "@rdfjs/types";

/**
 * An event listeners for nodes
 */
export type nodeEventListener<InAndOutQuad extends BaseQuad = BaseQuad> = (
  changes: DatasetChanges<InAndOutQuad>,
  transactionId: string,
  triggeringQuadMatch: QuadMatch,
) => void;

/**
 * Adds the bulk method for add and remove
 */
export interface IBulkEditableDataset<InAndOutQuad extends BaseQuad = BaseQuad>
  extends Dataset<InAndOutQuad, InAndOutQuad> {
  bulk(changes: DatasetChanges<InAndOutQuad>): this;
}

/**
 * Factory for creating SubscribableDatasets
 */
export type ISubscribableDatasetFactory<
  InAndOutQuad extends BaseQuad = BaseQuad,
> = DatasetFactory<
  InAndOutQuad,
  InAndOutQuad,
  ISubscribableDataset<InAndOutQuad>
>;

/**
 * Dataset that allows developers to subscribe to a sepecific term and be alerted
 * if a quad is added or removed containing that term. It's methods follow the
 * EventEmitter interface except take in namedNodes as keys.
 */
export interface ISubscribableDataset<InAndOutQuad extends BaseQuad = BaseQuad>
  extends IBulkEditableDataset<InAndOutQuad> {
  /**
   * Alias for emitter.on(eventName, listener).
   * @param eventName
   * @param listener
   * @returns
   */
  addListener(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this;

  /**
   * Synchronously calls each of the listeners registered for the event named eventName, in the order they were registered, passing the supplied arguments to each.
   * @param eventName
   * @param changes
   * @returns true if the event had listeners, false otherwise.
   */
  emit(eventName: QuadMatch, changes: DatasetChanges<InAndOutQuad>): boolean;

  /**
   * Returns an array listing the events for which the emitter has registered listeners. The values in the array are strings or Symbols.
   */
  eventNames(): QuadMatch[];

  /**
   * Returns the current max listener value for the EventEmitter which is either set by emitter.setMaxListeners(n) or defaults to events.defaultMaxListeners.
   */
  getMaxListeners(): number;

  /**
   * Returns the number of listeners listening to the event named eventName.
   */
  listenerCount(eventName: QuadMatch): number;

  /**
   * Returns a copy of the array of listeners for the event named eventName.
   */
  listeners(eventName: QuadMatch): nodeEventListener<InAndOutQuad>[];

  /**
   * Alias for emitter.removeListener()
   */
  off(eventName: QuadMatch, listener: nodeEventListener<InAndOutQuad>): void;

  /**
   * Adds the listener function to the end of the listeners array for the event named eventName. No checks are made to see if the listener has already been added. Multiple calls passing the same combination of eventName and listener will result in the listener being added, and called, multiple times.
   */
  on(eventName: QuadMatch, listener: nodeEventListener<InAndOutQuad>): this;

  /**
   * Adds a one-time listener function for the event named eventName. The next time eventName is triggered, this listener is removed and then invoked.
   */
  once(eventName: QuadMatch, listener: nodeEventListener<InAndOutQuad>): this;

  /**
   * Adds the listener function to the beginning of the listeners array for the event named eventName. No checks are made to see if the listener has already been added. Multiple calls passing the same combination of eventName and listener will result in the listener being added, and called, multiple times.
   */
  prependListener(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this;

  /**
   * Adds a one-time listener function for the event named eventName to the beginning of the listeners array. The next time eventName is triggered, this listener is removed, and then invoked.
   */
  prependOnceListener(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this;

  /**
   * Removes all listeners, or those of the specified eventName.
   */
  removeAllListeners(eventName: QuadMatch): this;

  /**
   * Removes the specified listener from the listener array for the event named eventName.
   */
  removeListener(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this;

  /**
   * Removes the specified listener from all events
   */
  removeListenerFromAllEvents(listener: nodeEventListener<InAndOutQuad>): this;

  /**
   * By default EventEmitters will print a warning if more than 10 listeners are added for a particular event. This is a useful default that helps finding memory leaks. The emitter.setMaxListeners() method allows the limit to be modified for this specific EventEmitter instance. The value can be set to Infinity (or 0) to indicate an unlimited number of listeners.
   */
  setMaxListeners(n: number): this;

  /**
   * Returns a copy of the array of listeners for the event named eventName, including any wrappers (such as those created by .once()).
   */
  rawListeners(eventName: QuadMatch): nodeEventListener<InAndOutQuad>[];

  /**
   * ==================================================================
   * TRANSACTION METHODS
   * ==================================================================
   */

  /**
   * Returns a transactional dataset that will update this dataset when its transaction is committed.
   */
  startTransaction(): ITransactionDataset<InAndOutQuad>;
}

/**
 * Creates a TransactionDataset
 */
export interface ITransactionDatasetFactory<
  InAndOutQuad extends BaseQuad = BaseQuad,
> {
  transactionDataset(
    parent: Dataset<InAndOutQuad, InAndOutQuad>,
  ): ITransactionDataset<InAndOutQuad>;
}

/**
 * A dataset that allows you to modify the dataset and
 */
export interface ITransactionDataset<InAndOutQuad extends BaseQuad = BaseQuad>
  extends ISubscribableDataset<InAndOutQuad> {
  readonly parentDataset: Dataset<InAndOutQuad, InAndOutQuad>;
  rollback(): void;
  commit(): void;
  getChanges(): DatasetChanges<InAndOutQuad>;
  hasChanges(): boolean;
}
