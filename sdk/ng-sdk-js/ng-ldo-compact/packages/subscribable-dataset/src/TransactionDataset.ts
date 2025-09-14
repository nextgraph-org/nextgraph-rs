import type { Dataset, BaseQuad, Term, DatasetFactory } from "@rdfjs/types";
import type { DatasetChanges } from "@ldo/rdf-utils";
import type {
  ITransactionDataset,
  ITransactionDatasetFactory,
} from "./types.js";
import { mergeDatasetChanges } from "./mergeDatasetChanges.js";
import { SubscribableDataset } from "./SubscribableDataset.js";
import { updateDatasetInBulk } from "./util.js";

/**
 * Proxy Transactional Dataset is a transactional dataset that does not duplicate
 * the parent dataset, it will dynamically determine the correct return value for
 * methods in real time when the method is called.
 */
export class TransactionDataset<InAndOutQuad extends BaseQuad = BaseQuad>
  extends SubscribableDataset<InAndOutQuad>
  implements ITransactionDataset<InAndOutQuad>
{
  /**
   * The parent dataset that will be updated upon commit
   */
  public readonly parentDataset: Dataset<InAndOutQuad, InAndOutQuad>;

  /**
   * The changes made that are ready to commit
   */
  private datasetChanges: DatasetChanges<InAndOutQuad>;

  /**
   * A list of changes made to the parent dataset upon commit used for rolling back changes.
   * This is different from 'datasetChanges' because datasetChanges is allowed to overlap
   * with the parent dataset.
   * For example, the parent dataset may already have triple A, and datasetChanges can
   * also have triple A.
   */
  private committedDatasetChanges?: DatasetChanges<InAndOutQuad>;

  /**
   * Constructor
   * @param parentDataset The dataset that will be updated upon commit
   */
  constructor(
    parentDataset: Dataset<InAndOutQuad, InAndOutQuad>,
    datasetFactory: DatasetFactory<InAndOutQuad, InAndOutQuad>,
    transactionDatasetFactory: ITransactionDatasetFactory<InAndOutQuad>,
  ) {
    super(datasetFactory, transactionDatasetFactory, datasetFactory.dataset());
    this.parentDataset = parentDataset;
    this.datasetChanges = {};
  }

  /**
   * ==================================================================
   * DATASET METHODS
   * ==================================================================
   */

  /**
   * Imports the quads into this dataset.
   * This method differs from Dataset.union in that it adds all quads to the current instance, rather than combining quads and the current instance to create a new instance.
   * @param quads
   * @returns the dataset instance it was called on.
   */
  public addAll(
    quads: Dataset<InAndOutQuad, InAndOutQuad> | InAndOutQuad[],
  ): this {
    this.updateDatasetChanges({ added: quads });
    return this;
  }

  /**
   * Bulk add and remove triples
   * @param changed
   */
  public bulk(changes: DatasetChanges<InAndOutQuad>): this {
    this.updateDatasetChanges(changes);
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
  deleteMatches(
    subject?: Term,
    predicate?: Term,
    object?: Term,
    graph?: Term,
  ): this {
    this.checkIfTransactionCommitted();
    const matching = this.match(subject, predicate, object, graph);
    for (const quad of matching) {
      this.delete(quad);
    }
    return this;
  }

  /**
   * This method returns a new dataset that is comprised of all quads in the current instance matching the given arguments. The logic described in Quad Matching is applied for each quad in this dataset to check if it should be included in the output dataset.
   * @param subject
   * @param predicate
   * @param object
   * @param graph
   * @returns a Dataset with matching triples
   */
  public match(
    subject?: Term | null,
    predicate?: Term | null,
    object?: Term | null,
    graph?: Term | null,
  ): Dataset<InAndOutQuad, InAndOutQuad> {
    let finalMatch = this.parentDataset.match(
      subject,
      predicate,
      object,
      graph,
    );
    if (this.datasetChanges.removed) {
      finalMatch = finalMatch.difference(this.datasetChanges.removed);
    }
    if (this.datasetChanges.added) {
      finalMatch = finalMatch.union(
        this.datasetChanges.added.match(subject, predicate, object, graph),
      );
    }
    return finalMatch;
  }

  /**
   * A non-negative integer that specifies the number of quads in the set.
   */
  public get size(): number {
    return (
      this.parentDataset.size +
      (this.datasetChanges.added?.difference(this.parentDataset).size || 0) -
      (this.datasetChanges.removed?.intersection(this.parentDataset).size || 0)
    );
  }

  /**
   * Adds the specified quad to the dataset.
   * Existing quads, as defined in Quad.equals, will be ignored.
   * @param quad
   * @returns the dataset instance it was called on.
   */
  public add(quad: InAndOutQuad): this {
    this.updateDatasetChanges({ added: [quad] });
    return this;
  }

  /**
   * Removes the specified quad from the dataset.
   * This method returns the dataset instance it was called on.
   * @param quad
   */
  public delete(quad: InAndOutQuad): this {
    this.updateDatasetChanges({ removed: [quad] });
    return this;
  }

  /**
   * Determines whether a dataset includes a certain quad, returning true or false as appropriate.
   * @param quad
   */
  public has(quad: InAndOutQuad): boolean {
    return (
      !this.datasetChanges.removed?.has(quad) &&
      (this.datasetChanges.added?.has(quad) || this.parentDataset.has(quad))
    );
  }

  /**
   * Returns an iterator
   */
  public [Symbol.iterator](): Iterator<InAndOutQuad> {
    const addedIterator = (this.datasetChanges.added || [])[Symbol.iterator]();
    let addedNext = addedIterator.next();
    const parentIterator = this.parentDataset[Symbol.iterator]();
    let parentNext = parentIterator.next();
    return {
      next: () => {
        if (!addedNext || !addedNext.done) {
          const toReturn = addedNext;
          addedNext = addedIterator.next();
          return toReturn;
        }
        while (!parentNext.done) {
          const toReturn = parentNext;
          parentNext = parentIterator.next();
          if (
            !(
              this.datasetChanges.added &&
              this.datasetChanges.added.has(toReturn.value)
            ) &&
            !(
              this.datasetChanges.removed &&
              this.datasetChanges.removed.has(toReturn.value)
            )
          ) {
            return toReturn;
          }
        }
        return { value: undefined, done: true };
      },
    };
  }

  /**
   * ==================================================================
   * TANSACTIONAL METHODS
   * ==================================================================
   */

  /**
   * Checks if the transaction has been committed and throws an error if it has
   * @param changed
   */
  private checkIfTransactionCommitted() {
    if (this.committedDatasetChanges) {
      throw new Error("Transaction has already committed");
    }
  }

  /**
   * Helper method to update the changes made
   * @param changes
   */
  private updateDatasetChanges(changes: {
    added?: Dataset<InAndOutQuad> | InAndOutQuad[];
    removed?: Dataset<InAndOutQuad> | InAndOutQuad[];
  }): void {
    this.checkIfTransactionCommitted();
    const newDatasetChanges = {
      added: changes.added
        ? this.datasetFactory.dataset(changes.added)
        : undefined,
      removed: changes.removed
        ? this.datasetFactory.dataset(changes.removed)
        : undefined,
    };

    mergeDatasetChanges(this.datasetChanges, newDatasetChanges);

    this.triggerSubscriptionForQuads(newDatasetChanges);
  }

  /**
   * Helper method to update the parent dataset or any other provided dataset
   */
  private updateParentDataset(datasetChanges: DatasetChanges<InAndOutQuad>) {
    return updateDatasetInBulk(this.parentDataset, datasetChanges);
  }

  /**
   * Commits changes made to the parent dataset
   */
  public commit(): void {
    this.checkIfTransactionCommitted();
    this.committedDatasetChanges = {
      added: this.datasetChanges.added?.difference(this.parentDataset),
      removed: this.datasetChanges.removed?.intersection(this.parentDataset),
    };
    this.updateParentDataset(this.committedDatasetChanges);
  }

  /**
   * Rolls back changes made to the parent dataset
   */
  public rollback(): void {
    if (!this.committedDatasetChanges) {
      throw new Error(
        "Cannot rollback. Transaction has not yet been committed",
      );
    }
    this.updateParentDataset({
      added: this.committedDatasetChanges.removed,
      removed: this.committedDatasetChanges.added,
    });
    this.committedDatasetChanges = undefined;
  }

  public getChanges(): DatasetChanges<InAndOutQuad> {
    return this.datasetChanges;
  }

  /**
   * Returns true if the transaction is holding changes that have yet to be committed.
   * Returns false if no changes have yet been made to it.
   */
  public hasChanges(): boolean {
    return (
      ((this.datasetChanges.added && this.datasetChanges.added.size > 0) ||
        (this.datasetChanges.removed &&
          this.datasetChanges.removed.size > 0)) ??
      false
    );
  }
}
