import { EventEmitter } from "events";
import { quadMatchToString, stringToQuadMatch } from "@ldo/rdf-utils";
import type {
  DatasetChanges,
  QuadMatch,
  SubjectNode,
  PredicateNode,
  ObjectNode,
  GraphNode,
} from "@ldo/rdf-utils";
import type { Dataset, BaseQuad, Term, DatasetFactory } from "@rdfjs/types";
import type {
  nodeEventListener,
  ISubscribableDataset,
  ITransactionDataset,
  ITransactionDatasetFactory,
} from "./types.js";
import { ExtendedDataset } from "@ldo/dataset";
import { v4 } from "uuid";

/**
 * A wrapper for a dataset that allows subscriptions to be made on nodes to
 * be triggered whenever a quad containing that added or removed.
 */
export class SubscribableDataset<InAndOutQuad extends BaseQuad = BaseQuad>
  extends ExtendedDataset<InAndOutQuad>
  implements ISubscribableDataset<InAndOutQuad>
{
  /**
   * DatasetFactory for creating new datasets
   */
  protected datasetFactory: DatasetFactory<InAndOutQuad>;

  /**
   * The underlying event emitter
   */
  protected eventEmitter: EventEmitter;
  /**
   * The underlying dataset factory for creating transaction datasets
   */
  protected transactionDatasetFactory: ITransactionDatasetFactory<InAndOutQuad>;
  /**
   * Helps find all the events for a given listener
   */
  protected listenerHashMap: Map<nodeEventListener<InAndOutQuad>, Set<string>> =
    new Map();

  /**
   * @param datasetFactory A RDF/JS Dataset Factory
   * @param initialDataset An RDF/JS Dataset with initial Quads
   */
  constructor(
    datasetFactory: DatasetFactory<InAndOutQuad, InAndOutQuad>,
    transactionDatasetFactory: ITransactionDatasetFactory<InAndOutQuad>,
    initialDataset?: Dataset<InAndOutQuad, InAndOutQuad>,
  ) {
    super(initialDataset || datasetFactory.dataset(), datasetFactory);
    this.transactionDatasetFactory = transactionDatasetFactory;
    this.eventEmitter = new EventEmitter();
    this.datasetFactory = datasetFactory;
  }

  /**
   * ==================================================================
   * DATASET METHODS
   * ==================================================================
   */

  /**
   * A helper method that mimics what the super of addAll would be
   */
  private superAddAll(
    quads: Dataset<InAndOutQuad, InAndOutQuad> | InAndOutQuad[],
  ): this {
    for (const quad of quads) {
      super.add(quad);
    }
    return this;
  }

  /**
   * Imports the quads into this dataset.
   * This method differs from Dataset.union in that it adds all quads to the current instance, rather than combining quads and the current instance to create a new instance.
   * @param quads
   * @returns the dataset instance it was called on.
   */
  public addAll(
    quads: Dataset<InAndOutQuad, InAndOutQuad> | InAndOutQuad[],
  ): this {
    this.superAddAll(quads);
    this.triggerSubscriptionForQuads({
      added: this.datasetFactory.dataset(quads),
    });
    return this;
  }

  /**
   * Bulk add and remove triples
   * @param changed
   */
  public bulk(changed: DatasetChanges<InAndOutQuad>): this {
    if (changed.added) {
      this.superAddAll(changed.added);
    }
    if (changed.removed) {
      changed.removed.forEach((quad) => {
        super.delete(quad);
      });
    }
    this.triggerSubscriptionForQuads(changed);
    return this;
  }

  /**
   *  This method removes the quads in the current instance that match the given arguments. The logic described in Quad Matching is applied for each quad in this dataset to select the quads which will be deleted.
   * @param subject
   * @param predicate
   * @param object
   * @param graph
   * @returns the dataset instance it was called on.
   */
  public deleteMatches(
    subject?: Term,
    predicate?: Term,
    object?: Term,
    graph?: Term,
  ): this {
    const matching = super.match(subject, predicate, object, graph);
    for (const quad of matching) {
      super.delete(quad);
    }
    this.triggerSubscriptionForQuads({ removed: matching });
    return this;
  }

  /**
   * Adds the specified quad to the dataset.
   * Existing quads, as defined in Quad.equals, will be ignored.
   * @param quad
   * @returns the dataset instance it was called on.
   */
  public add(quad: InAndOutQuad): this {
    super.add(quad);
    this.triggerSubscriptionForQuads({
      added: this.datasetFactory.dataset([quad]),
    });
    return this;
  }

  /**
   * Removes the specified quad from the dataset.
   * This method returns the dataset instance it was called on.
   * @param quad
   */
  public delete(quad: InAndOutQuad): this {
    super.delete(quad);
    this.triggerSubscriptionForQuads({
      removed: this.datasetFactory.dataset([quad]),
    });
    return this;
  }

  /**
   * ==================================================================
   * EVENTEMITTER METHODS
   * ==================================================================
   */

  /**
   * Triggers all subscriptions based on an updated quads
   * @param changed The changed triples of the transaction
   */
  protected triggerSubscriptionForQuads(
    changed: DatasetChanges<InAndOutQuad>,
  ): void {
    // A mapping of serialized QuadMatches to the changed quads
    const matchingDatasetChanges: Record<
      string,
      {
        changes: DatasetChanges<InAndOutQuad>;
        triggerQuadMatch: QuadMatch;
      }
    > = {};

    // Population MatchingDatasetChanges
    const populateMatchingDatasetChanges = (
      changeType: "added" | "removed",
    ) => {
      const changedQuads = changed[changeType];
      changedQuads?.forEach((changedQuad) => {
        // Cast the input because RDFJS types assume RDF 1.2 where a Subject can
        // be a Quad
        const quad = changedQuad as {
          subject: SubjectNode;
          predicate: PredicateNode;
          object: ObjectNode;
          graph: GraphNode;
        };
        // All possible matches that could match with this triple
        const quadMatches: QuadMatch[] = [
          [null, null, null, null],
          [quad.subject, null, null, null],
          [quad.subject, quad.predicate, null, null],
          [quad.subject, null, quad.object, null],
          [null, quad.predicate, null, null],
          [null, quad.predicate, quad.object, null],
          [null, null, quad.object, null],
          [quad.subject, quad.predicate, quad.object, null],
          [null, null, null, quad.graph],
          [quad.subject, null, null, quad.graph],
          [quad.subject, quad.predicate, null, quad.graph],
          [quad.subject, null, quad.object, quad.graph],
          [null, quad.predicate, null, quad.graph],
          [null, quad.predicate, quad.object, quad.graph],
          [null, null, quad.object, quad.graph],
          [quad.subject, quad.predicate, quad.object, quad.graph],
        ];
        quadMatches.forEach((quadMatch) => {
          const eventName = quadMatchToString(quadMatch);
          // Only add to the map if there's actually a listener for this
          if (this.eventEmitter.listenerCount(eventName) > 0) {
            // Set matchingDatasetChanges to include data to emit
            if (!matchingDatasetChanges[eventName]) {
              matchingDatasetChanges[eventName] = {
                triggerQuadMatch: quadMatch,
                changes: {},
              };
            }
            if (!matchingDatasetChanges[eventName].changes[changeType]) {
              matchingDatasetChanges[eventName].changes[changeType] =
                this.datasetFactory.dataset();
            }
            matchingDatasetChanges[eventName].changes[changeType]?.add(
              changedQuad,
            );
          }
        });
      });
    };
    populateMatchingDatasetChanges("added");
    populateMatchingDatasetChanges("removed");

    const transactionId = v4();
    // Alert all listeners
    Object.entries(matchingDatasetChanges).forEach(
      ([quadMatchString, info]) => {
        this.eventEmitter.emit(
          quadMatchString,
          info.changes,
          transactionId,
          info.triggerQuadMatch,
        );
      },
    );
  }

  /**
   * Alias for emitter.on(eventName, listener).
   * @param eventName
   * @param listener
   * @returns
   */
  public addListener(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this {
    return this.on(eventName, listener);
  }

  /**
   * Synchronously calls each of the listeners registered for the event named eventName, in the order they were registered, passing the supplied arguments to each.
   * @param eventName
   * @param dataset
   * @param datasetChanges
   * @returns true if the event had listeners, false otherwise.
   */
  public emit(
    eventName: QuadMatch,
    changes: DatasetChanges<InAndOutQuad>,
  ): boolean {
    return this.eventEmitter.emit(quadMatchToString(eventName), changes);
  }

  /**
   * Returns an array listing the events for which the emitter has registered listeners. The values in the array are strings or Symbols.
   */
  public eventNames(): QuadMatch[] {
    return this.eventEmitter
      .eventNames()
      .map((eventName) => stringToQuadMatch(eventName as string));
  }

  /**
   * Returns the current max listener value for the EventEmitter which is either set by emitter.setMaxListeners(n) or defaults to events.defaultMaxListeners.
   */
  public getMaxListeners(): number {
    return this.eventEmitter.getMaxListeners();
  }

  /**
   * Returns the number of listeners listening to the event named eventName.
   */
  public listenerCount(eventName: QuadMatch): number {
    return this.eventEmitter.listenerCount(quadMatchToString(eventName));
  }

  /**
   * Returns a copy of the array of listeners for the event named eventName.
   */
  public listeners(eventName: QuadMatch): nodeEventListener<InAndOutQuad>[] {
    return this.eventEmitter.listeners(
      quadMatchToString(eventName),
    ) as nodeEventListener<InAndOutQuad>[];
  }

  /**
   * Alias for emitter.removeListener()
   */
  public off(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): void {
    this.removeListener(eventName, listener);
  }

  /**
   * Adds the listener function to the end of the listeners array for the event named eventName. No checks are made to see if the listener has already been added. Multiple calls passing the same combination of eventName and listener will result in the listener being added, and called, multiple times.
   */
  public on(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this {
    const eventString = quadMatchToString(eventName);
    if (!this.listenerHashMap.has(listener)) {
      this.listenerHashMap.set(listener, new Set());
    }
    this.listenerHashMap.get(listener)?.add(eventString);
    this.eventEmitter.on(eventString, listener);
    return this;
  }

  /**
   * Adds a one-time listener function for the event named eventName. The next time eventName is triggered, this listener is removed and then invoked.
   */
  public once(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this {
    this.eventEmitter.once(quadMatchToString(eventName), listener);
    return this;
  }

  /**
   * Adds the listener function to the beginning of the listeners array for the event named eventName. No checks are made to see if the listener has already been added. Multiple calls passing the same combination of eventName and listener will result in the listener being added, and called, multiple times.
   */
  public prependListener(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this {
    this.eventEmitter.prependListener(quadMatchToString(eventName), listener);
    return this;
  }

  /**
   * Adds a one-time listener function for the event named eventName to the beginning of the listeners array. The next time eventName is triggered, this listener is removed, and then invoked.
   */
  public prependOnceListener(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this {
    this.eventEmitter.prependOnceListener(
      quadMatchToString(eventName),
      listener,
    );
    return this;
  }

  /**
   * Removes all listeners, or those of the specified eventName.
   */
  public removeAllListeners(eventName: QuadMatch): this {
    this.eventEmitter.removeAllListeners(quadMatchToString(eventName));
    return this;
  }

  /**
   * Removes the specified listener from the listener array for the event named eventName.
   */
  public removeListener(
    eventName: QuadMatch,
    listener: nodeEventListener<InAndOutQuad>,
  ): this {
    this.eventEmitter.removeListener(quadMatchToString(eventName), listener);
    return this;
  }

  /**
   * Removes the specified listener from the listener array for the event named eventName.
   */
  removeListenerFromAllEvents(listener: nodeEventListener<InAndOutQuad>): this {
    const eventStringSet = this.listenerHashMap.get(listener);
    if (eventStringSet) {
      eventStringSet.forEach((eventString) => {
        this.eventEmitter.off(eventString, listener);
      });
    }
    return this;
  }

  /**
   * By default EventEmitters will print a warning if more than 10 listeners are added for a particular event. This is a useful default that helps finding memory leaks. The emitter.setMaxListeners() method allows the limit to be modified for this specific EventEmitter instance. The value can be set to Infinity (or 0) to indicate an unlimited number of listeners.
   */
  public setMaxListeners(n: number): this {
    this.eventEmitter.setMaxListeners(n);
    return this;
  }

  /**
   * Returns a copy of the array of listeners for the event named eventName, including any wrappers (such as those created by .once()).
   */
  public rawListeners(eventName: QuadMatch): nodeEventListener<InAndOutQuad>[] {
    return this.eventEmitter.rawListeners(
      quadMatchToString(eventName),
    ) as nodeEventListener[];
  }

  /**
   * ==================================================================
   * TRANSACTION METHODS
   * ==================================================================
   */

  /**
   * Returns a transactional dataset that will update this dataset when its transaction is committed.
   */
  public startTransaction(): ITransactionDataset<InAndOutQuad> {
    return this.transactionDatasetFactory.transactionDataset(this);
  }
}
