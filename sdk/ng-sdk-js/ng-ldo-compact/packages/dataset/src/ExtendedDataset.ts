import {
  type DatasetCore,
  type Dataset,
  type BaseQuad,
  type Stream,
  type Term,
  type DatasetCoreFactory,
  type Quad,
} from "@rdfjs/types";
import { datasetToString } from "@ldo/rdf-utils";
import { Readable } from "readable-stream";

/**
 * A full implementation of the RDF JS Dataset interface.
 */
export default class ExtendedDataset<InAndOutQuad extends BaseQuad = BaseQuad>
  implements Dataset<InAndOutQuad, InAndOutQuad>
{
  /**
   * The main backing dataset
   */
  protected dataset: DatasetCore<InAndOutQuad, InAndOutQuad>;

  /**
   * A factory that generates datasets for the methods
   */
  protected datasetCoreFactory: DatasetCoreFactory<InAndOutQuad, InAndOutQuad>;

  /**
   * Constructor
   */
  constructor(
    dataset: DatasetCore<InAndOutQuad, InAndOutQuad>,
    datasetFactory: DatasetCoreFactory<InAndOutQuad, InAndOutQuad>,
  ) {
    this.dataset = dataset;
    this.datasetCoreFactory = datasetFactory;
  }

  /**
   * Creates a blank dataset using the dataset factory
   */
  private createBlankDataset(): Dataset<InAndOutQuad, InAndOutQuad> {
    return new ExtendedDataset<InAndOutQuad>(
      this.datasetCoreFactory.dataset(),
      this.datasetCoreFactory,
    );
  }

  /**
   * Imports the quads into this dataset.
   * This method differs from Dataset.union in that it adds all quads to the current instance, rather than combining quads and the current instance to create a new instance.
   * @param quads
   * @returns the dataset instance it was called on.
   */
  addAll(quads: InAndOutQuad[] | Dataset<InAndOutQuad>): this {
    for (const quad of quads) {
      this.add(quad);
    }
    return this;
  }

  /**
   * Returns true if the current instance is a superset of the given dataset; differently put: if the given dataset is a subset of, is contained in the current dataset.
   * Blank Nodes will be normalized.
   * @param other
   */
  contains(other: Dataset<InAndOutQuad>): boolean {
    if (other.size > this.size) {
      return false;
    }
    for (const quad of other) {
      if (!this.has(quad)) {
        return false;
      }
    }
    return true;
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
    const matching = this.match(subject, predicate, object, graph);
    for (const quad of matching) {
      this.dataset.delete(quad);
    }
    return this;
  }

  /**
   * Returns a new dataset that contains alls quads from the current dataset, not included in the given dataset.
   * @param other
   */
  difference(
    other: DatasetCore<InAndOutQuad>,
  ): Dataset<InAndOutQuad, InAndOutQuad> {
    const dataset = this.createBlankDataset();
    for (const quad of this) {
      if (!other.has(quad)) {
        dataset.add(quad);
      }
    }
    return dataset;
  }

  /**
   * Returns true if the current instance contains the same graph structure as the given dataset.
   * @param other
   */
  equals(other: Dataset<InAndOutQuad, InAndOutQuad>): boolean {
    if (this.size !== other.size) {
      return false;
    }
    for (const quad of this) {
      if (!other.has(quad)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Universal quantification method, tests whether every quad in the dataset passes the test implemented by the provided iteratee.
   * This method immediately returns boolean false once a quad that does not pass the test is found.
   * This method always returns boolean true on an empty dataset.
   * Note: This method is aligned with Array.prototype.every() in ECMAScript-262.
   * @param iteratee
   */
  every(iteratee: (quad: InAndOutQuad, dataset: this) => boolean): boolean {
    for (const quad of this) {
      if (!iteratee(quad, this)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Creates a new dataset with all the quads that pass the test implemented by the provided iteratee.
   * Note: This method is aligned with Array.prototype.filter() in ECMAScript-262.
   * @param iteratee
   */
  filter(
    iteratee: (quad: InAndOutQuad, dataset: this) => boolean,
  ): Dataset<InAndOutQuad, InAndOutQuad> {
    const dataset = this.createBlankDataset();
    for (const quad of this) {
      if (iteratee(quad, this)) {
        dataset.add(quad);
      }
    }
    return dataset;
  }

  /**
   * Executes the provided iteratee once on each quad in the dataset.
   * Note: This method is aligned with Array.prototype.forEach() in ECMAScript-262.
   * @param iteratee
   */
  forEach(iteratee: (quad: InAndOutQuad, dataset: this) => void): void {
    for (const quad of this) {
      iteratee(quad, this);
    }
  }

  /**
   * Imports all quads from the given stream into the dataset.
   * The stream events end and error are wrapped in a Promise.
   * @param stream
   */
  import(stream: Stream<InAndOutQuad>): Promise<this> {
    return new Promise((resolve, reject) => {
      stream
        .on("data", (quad) => {
          this.add(quad);
        })
        .on("end", () => {
          resolve(this);
        })
        .on("error", (err) => reject(err));
    });
  }

  /**
   * Returns a new dataset containing alls quads from the current dataset that are also included in the given dataset.
   * @param other
   */
  intersection(
    other: Dataset<InAndOutQuad, InAndOutQuad>,
  ): Dataset<InAndOutQuad, InAndOutQuad> {
    const dataset = this.createBlankDataset();
    const iteratingDataset = this.size < other.size ? this : other;
    const comparingDataset = this.size < other.size ? other : this;
    for (const quad of iteratingDataset) {
      if (comparingDataset.has(quad)) {
        dataset.add(quad);
      }
    }
    return dataset;
  }

  /**
   * Returns a new dataset containing all quads returned by applying iteratee to each quad in the current dataset.
   * @param iteratee
   */
  map(
    iteratee: (quad: InAndOutQuad, dataset: this) => InAndOutQuad,
  ): Dataset<InAndOutQuad, InAndOutQuad> {
    const dataset = this.createBlankDataset();
    for (const quad of this) {
      dataset.add(iteratee(quad, this));
    }
    return dataset;
  }

  /**
   * This method calls the iteratee on each quad of the DatasetCore. The first time the iteratee is called, the accumulator value is the initialValue or, if not given, equals to the first quad of the Dataset. The return value of the iteratee is used as accumulator value for the next calls.
   * This method returns the return value of the last iteratee call.
   * Note: This method is aligned with Array.prototype.reduce() in ECMAScript-262.
   * @param iteratee
   * @param initialValue
   */
  reduce<A = unknown>(
    iteratee: (accumulator: A, quad: InAndOutQuad, dataset: this) => A,
    initialValue?: A,
  ): A {
    if (this.size === 0 && initialValue == undefined) {
      throw new Error(
        "Cannot reduce an empty Dataset without an initial value.",
      );
    }
    const thisIterator: Iterator<InAndOutQuad> = this[Symbol.iterator]();
    let iteratorResult = thisIterator.next();
    let accumulatedValue: A = initialValue as A;
    while (!iteratorResult.done) {
      accumulatedValue = iteratee(accumulatedValue, iteratorResult.value, this);
      iteratorResult = thisIterator.next();
    }
    return accumulatedValue;
  }

  /**
   * Existential quantification method, tests whether some quads in the dataset pass the test implemented by the provided iteratee.
   * Note: This method is aligned with Array.prototype.some() in ECMAScript-262.
   * @param iteratee
   * @returns boolean true once a quad that passes the test is found.
   */
  some(iteratee: (quad: InAndOutQuad, dataset: this) => boolean): boolean {
    for (const quad of this) {
      if (iteratee(quad, this)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the set of quads within the dataset as a host language native sequence, for example an Array in ECMAScript-262.
   * Note: Since a DatasetCore is an unordered set, the order of the quads within the returned sequence is arbitrary.
   */
  toArray(): InAndOutQuad[] {
    const array: InAndOutQuad[] = [];
    for (const quad of this) {
      array.push(quad);
    }
    return array;
  }

  /**
   * Returns an N-Quads string representation of the dataset, preprocessed with RDF Dataset Normalization algorithm.
   */
  toCanonical(): string {
    throw new Error("Method not implemented.");
  }

  /**
   * Returns a stream that contains all quads of the dataset.
   */
  toStream(): Stream<InAndOutQuad> {
    const iterator = this[Symbol.iterator]();
    let curNext = iterator.next();
    const stream = new Readable({
      objectMode: true,
      read() {
        if (curNext.done || !curNext.value) {
          this.push(null);
          return;
        }
        this.push(curNext.value);
        curNext = iterator.next();
      },
    });
    return stream;
  }

  /**
   * Returns an N-Quads string representation of the dataset.
   * No prior normalization is required, therefore the results for the same quads may vary depending on the Dataset implementation.
   */
  toString(): string {
    return datasetToString(this as Dataset<Quad>, { format: "N-Triples" });
  }

  /**
   * Returns a new Dataset that is a concatenation of this dataset and the quads given as an argument.
   * @param other
   */
  union(
    other: Dataset<InAndOutQuad, InAndOutQuad>,
  ): Dataset<InAndOutQuad, InAndOutQuad> {
    const dataset = this.createBlankDataset();
    for (const quad of this) {
      dataset.add(quad);
    }
    for (const quad of other) {
      dataset.add(quad);
    }
    return dataset;
  }

  /**
   * This method returns a new dataset that is comprised of all quads in the current instance matching the given arguments. The logic described in Quad Matching is applied for each quad in this dataset to check if it should be included in the output dataset.
   * @param subject
   * @param predicate
   * @param object
   * @param graph
   * @returns a Dataset with matching triples
   */
  match(
    subject?: Term | null,
    predicate?: Term | null,
    object?: Term | null,
    graph?: Term | null,
  ): Dataset<InAndOutQuad, InAndOutQuad> {
    return new ExtendedDataset(
      this.dataset.match(subject, predicate, object, graph),
      this.datasetCoreFactory,
    );
  }

  /**
   * A non-negative integer that specifies the number of quads in the set.
   */
  public get size(): number {
    return this.dataset.size;
  }

  /**
   * Adds the specified quad to the dataset.
   * Existing quads, as defined in Quad.equals, will be ignored.
   * @param quad
   * @returns the dataset instance it was called on.
   */
  public add(quad: InAndOutQuad): this {
    this.dataset.add(quad);
    return this;
  }

  /**
   * Removes the specified quad from the dataset.
   * This method returns the dataset instance it was called on.
   * @param quad
   */
  public delete(quad: InAndOutQuad): this {
    this.dataset.delete(quad);
    return this;
  }

  /**
   * Determines whether a dataset includes a certain quad, returning true or false as appropriate.
   * @param quad
   */
  public has(quad: InAndOutQuad): boolean {
    return Boolean(this.dataset.has(quad));
  }

  /**
   * Returns an iterator
   */
  public [Symbol.iterator](): Iterator<InAndOutQuad, InAndOutQuad, undefined> {
    return this.dataset[Symbol.iterator]();
  }
}
