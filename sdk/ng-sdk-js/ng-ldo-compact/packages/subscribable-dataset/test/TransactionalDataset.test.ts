import { quad, namedNode, literal } from "@ldo/rdf-utils";
import type {
  Dataset,
  DatasetCoreFactory,
  Quad,
  DatasetCore,
} from "@rdfjs/types";
import type { ISubscribableDataset } from "../src/index.js";
import { ExtendedDatasetFactory, createDataset } from "@ldo/dataset";
import {
  TransactionDataset,
  createSubscribableDataset,
  createTransactionDatasetFactory,
} from "../src/index.js";
import datasetCoreFactory from "@rdfjs/dataset";

describe("TransactionDataset", () => {
  let parentDataset: ISubscribableDataset<Quad>;
  let transactionalDataset: TransactionDataset<Quad>;
  const tomTypeQuad = quad(
    namedNode("http://example.org/cartoons#Tom"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Cat"),
  );
  const tomNameQuad = quad(
    namedNode("http://example.org/cartoons#Tom"),
    namedNode("http://example.org/cartoons#name"),
    literal("Tom"),
  );
  const lickyNameQuad = quad(
    namedNode("http://example.org/cartoons#Licky"),
    namedNode("http://example.org/cartoons#name"),
    literal("Licky"),
  );
  const lickyTypeQuad = quad(
    namedNode("http://example.org/cartoons#Licky"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Cat"),
  );
  const datasetFactory: DatasetCoreFactory = {
    dataset: (quads?: Dataset | Quad[]): DatasetCore => {
      return datasetCoreFactory.dataset(quads ? Array.from(quads) : undefined);
    },
  };
  const extendedDatasetFactory = new ExtendedDatasetFactory(datasetFactory);

  const initializeWithExtendedDatasetParent = (quads?: Quad[]) => {
    parentDataset = createSubscribableDataset(
      quads || [tomTypeQuad, tomNameQuad],
    );
    transactionalDataset = new TransactionDataset(
      parentDataset,
      extendedDatasetFactory,
      createTransactionDatasetFactory(),
    );
  };

  beforeEach(() => {
    initializeWithExtendedDatasetParent();
  });

  it("Adds without adding to the parent", () => {
    const addedQuad = lickyNameQuad;
    transactionalDataset.add(addedQuad);
    expect(transactionalDataset.has(addedQuad)).toBe(true);
    expect(parentDataset.has(addedQuad)).toBe(false);
  });

  it("Deletes without deleting from the parent", () => {
    const deletedQuad = tomTypeQuad;
    transactionalDataset.delete(deletedQuad);
    expect(transactionalDataset.has(deletedQuad)).toBe(false);
    expect(parentDataset.has(deletedQuad)).toBe(true);
  });

  it("Adds a quad already in the dataset with no duplicates", () => {
    const addedQuad = tomTypeQuad;
    transactionalDataset.add(addedQuad);
    const arr = transactionalDataset.toArray();
    expect(arr.length).toBe(2);
    expect(arr.some((curQuad) => curQuad.equals(tomNameQuad))).toBe(true);
    expect(arr.some((curQuad) => curQuad.equals(tomTypeQuad))).toBe(true);
  });

  it("Adds multiple quads", () => {
    transactionalDataset.add(lickyNameQuad);
    transactionalDataset.add(lickyTypeQuad);
    expect(transactionalDataset.size).toBe(4);
    expect(transactionalDataset.has(lickyNameQuad)).toBe(true);
    expect(transactionalDataset.has(lickyTypeQuad)).toBe(true);
  });

  it("Removes a quad that's not in the dataset and nothing happens", () => {
    const removedQuad = lickyNameQuad;
    transactionalDataset.delete(removedQuad);
    const arr = transactionalDataset.toArray();
    expect(arr.length).toBe(2);
    expect(arr.some((curQuad) => curQuad.equals(tomNameQuad))).toBe(true);
    expect(arr.some((curQuad) => curQuad.equals(tomTypeQuad))).toBe(true);
  });

  it("Removes multiple quads", () => {
    transactionalDataset.delete(tomNameQuad);
    transactionalDataset.delete(tomTypeQuad);
    expect(transactionalDataset.size).toBe(0);
  });

  it("Removes then adds a quad and they cancel out", () => {
    const removedQuad = tomTypeQuad;
    transactionalDataset.delete(removedQuad);
    transactionalDataset.add(removedQuad);
    const arr = transactionalDataset.toArray();
    expect(arr.length).toBe(2);
    expect(arr.some((curQuad) => curQuad.equals(tomNameQuad))).toBe(true);
    expect(arr.some((curQuad) => curQuad.equals(tomTypeQuad))).toBe(true);
  });

  it("Adds then removes a quad and they cancel out", () => {
    const addedQuad = lickyNameQuad;
    transactionalDataset.add(addedQuad);
    transactionalDataset.delete(addedQuad);
    const arr = transactionalDataset.toArray();
    expect(arr.length).toBe(2);
    expect(arr.some((curQuad) => curQuad.equals(tomNameQuad))).toBe(true);
    expect(arr.some((curQuad) => curQuad.equals(tomTypeQuad))).toBe(true);
  });

  it("Removes then adds a quad and the quad is still added", () => {
    const addedQuad = lickyNameQuad;
    transactionalDataset.delete(addedQuad);
    transactionalDataset.add(addedQuad);
    const arr = transactionalDataset.toArray();
    expect(arr.length).toBe(3);
    expect(arr.some((curQuad) => curQuad.equals(tomNameQuad))).toBe(true);
    expect(arr.some((curQuad) => curQuad.equals(tomTypeQuad))).toBe(true);
    expect(arr.some((curQuad) => curQuad.equals(lickyNameQuad))).toBe(true);
  });

  it("Commits added changes", () => {
    transactionalDataset.add(lickyNameQuad);
    transactionalDataset.commit();
    expect(parentDataset.has(lickyNameQuad)).toBe(true);
  });

  it("Commits removed changes", () => {
    transactionalDataset.delete(tomTypeQuad);
    transactionalDataset.commit();
    expect(parentDataset.has(tomTypeQuad)).toBe(false);
  });

  it("Commits added and removed changes", () => {
    transactionalDataset.add(lickyNameQuad);
    transactionalDataset.delete(tomTypeQuad);
    transactionalDataset.commit();
    expect(parentDataset.has(lickyNameQuad)).toBe(true);
    expect(parentDataset.has(tomTypeQuad)).toBe(false);
  });

  it("Errors whenever you try to add or remove triples after committing.", () => {
    transactionalDataset.commit();
    expect(() => transactionalDataset.add(lickyNameQuad)).toThrow(
      "Transaction has already committed",
    );
    expect(() => transactionalDataset.delete(tomTypeQuad)).toThrow(
      "Transaction has already committed",
    );
    expect(() => transactionalDataset.addAll([lickyNameQuad])).toThrow(
      "Transaction has already committed",
    );
    expect(() =>
      transactionalDataset.deleteMatches(
        tomTypeQuad.subject,
        tomTypeQuad.predicate,
        tomTypeQuad.object,
      ),
    ).toThrow("Transaction has already committed");
    // Nothing Matches it should still error
    expect(() =>
      transactionalDataset.deleteMatches(
        lickyNameQuad.subject,
        lickyNameQuad.predicate,
        lickyNameQuad.object,
      ),
    ).toThrow("Transaction has already committed");
  });

  it("Does not rollback unless it has already committed", () => {
    expect(() => transactionalDataset.rollback()).toThrow(
      "Cannot rollback. Transaction has not yet been committed",
    );
  });

  it("Rolls back the dataset", () => {
    transactionalDataset.add(lickyNameQuad);
    transactionalDataset.delete(tomTypeQuad);
    transactionalDataset.commit();
    transactionalDataset.rollback();
    expect(parentDataset.size).toBe(2);
    expect(parentDataset.has(tomTypeQuad)).toBe(true);
    expect(parentDataset.has(tomNameQuad)).toBe(true);
  });

  it("Rolls back the dataset when redundant changes are made", () => {
    transactionalDataset.add(tomTypeQuad);
    transactionalDataset.delete(lickyNameQuad);
    transactionalDataset.commit();
    transactionalDataset.rollback();
    expect(parentDataset.size).toBe(2);
    expect(parentDataset.has(tomTypeQuad)).toBe(true);
    expect(parentDataset.has(tomNameQuad)).toBe(true);
  });

  it("Counts the correct size given added quads", () => {
    transactionalDataset.add(lickyNameQuad);
    expect(transactionalDataset.size).toBe(3);
  });

  it("Counts the correct size given added redundant quads", () => {
    transactionalDataset.add(tomTypeQuad);
    expect(transactionalDataset.size).toBe(2);
  });

  it("Counts the correct size given deleted quads", () => {
    transactionalDataset.delete(tomTypeQuad);
    expect(transactionalDataset.size).toBe(1);
  });

  it("Counts the correct size given deleted redundant quads", () => {
    transactionalDataset.delete(lickyNameQuad);
    expect(transactionalDataset.size).toBe(2);
  });

  it("Counts the correct size given added and deleted quads", () => {
    transactionalDataset.add(lickyNameQuad);
    transactionalDataset.delete(tomTypeQuad);
    expect(transactionalDataset.size).toBe(2);
  });

  it("Adds all", () => {
    transactionalDataset.addAll([lickyNameQuad, lickyTypeQuad]);
    expect(transactionalDataset.has(lickyTypeQuad)).toBe(true);
    expect(transactionalDataset.has(lickyNameQuad)).toBe(true);
  });

  it("Makes changes in bulk", () => {
    transactionalDataset.bulk({
      added: extendedDatasetFactory.dataset([lickyNameQuad]),
      removed: extendedDatasetFactory.dataset([tomTypeQuad]),
    });
    expect(transactionalDataset.size).toBe(2);
    expect(transactionalDataset.has(tomTypeQuad)).toBe(false);
    expect(transactionalDataset.has(lickyNameQuad)).toBe(true);
  });

  it("Deletes matching data", () => {
    transactionalDataset.deleteMatches(
      tomTypeQuad.subject,
      undefined,
      undefined,
    );
    expect(transactionalDataset.size).toBe(0);
  });

  it("Matches an unmodified dataset", () => {
    const matchingDataset = transactionalDataset.match(
      tomTypeQuad.subject,
      undefined,
      undefined,
    );
    expect(matchingDataset.size).toBe(2);
    expect(matchingDataset.has(tomTypeQuad)).toBe(true);
    expect(matchingDataset.has(tomNameQuad)).toBe(true);
  });

  it("Matches a dataset with a removed quad", () => {
    initializeWithExtendedDatasetParent([
      tomNameQuad,
      tomTypeQuad,
      lickyNameQuad,
      lickyTypeQuad,
    ]);
    transactionalDataset.delete(tomNameQuad);
    const matchingDataset = transactionalDataset.match(
      tomTypeQuad.subject,
      undefined,
      undefined,
    );
    expect(matchingDataset.size).toBe(1);
    expect(matchingDataset.has(tomTypeQuad)).toBe(true);
    expect(matchingDataset.has(tomNameQuad)).toBe(false);
  });

  it("matches a dataset with an added quad", () => {
    transactionalDataset.add(lickyNameQuad);
    const matchingDataset = transactionalDataset.match(
      undefined,
      tomNameQuad.predicate,
      undefined,
    );
    expect(matchingDataset.size).toBe(2);
    expect(matchingDataset.has(lickyNameQuad)).toBe(true);
    expect(matchingDataset.has(tomNameQuad)).toBe(true);
  });

  it("Uses bulk update on commit when the parent dataset is bulk updatable", () => {
    // Disable for tests
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const mockParent: ISubscribableDataset<Quad> = {
      bulk: jest.fn(),
      has: (curQuad) => parentDataset.has(curQuad),
      [Symbol.iterator]: () => parentDataset[Symbol.iterator](),
    };
    transactionalDataset = new TransactionDataset<Quad>(
      mockParent,
      extendedDatasetFactory,
      createTransactionDatasetFactory(),
    );

    transactionalDataset.add(lickyNameQuad);
    transactionalDataset.delete(tomTypeQuad);
    transactionalDataset.commit();
    expect(mockParent.bulk).toHaveBeenCalled();
  });

  it("Uses bulk update on commit when the parent dataset is not bulk updatable", () => {
    // Disable for tests
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const mockParent: Dataset<Quad> = createDataset([tomTypeQuad]);
    transactionalDataset = new TransactionDataset<Quad>(
      mockParent,
      extendedDatasetFactory,
      createTransactionDatasetFactory(),
    );

    transactionalDataset.add(lickyNameQuad);
    transactionalDataset.delete(tomTypeQuad);
    transactionalDataset.commit();
    expect(mockParent.has(lickyNameQuad)).toBe(true);
    expect(mockParent.has(tomTypeQuad)).toBe(false);
  });

  it("Returns a transactional dataset", () => {
    expect(
      transactionalDataset.startTransaction() instanceof TransactionDataset,
    ).toBe(true);
  });

  it("Checks if it has a quad when it wasn't added to the transaction but was in the original dataset", () => {
    expect(transactionalDataset.has(tomTypeQuad)).toBe(true);
  });

  it("returns the dataset changes", () => {
    const addedQuad = lickyNameQuad;
    transactionalDataset.add(addedQuad);
    const datasetChanges = transactionalDataset.getChanges();
    expect(datasetChanges.added?.size).toBe(1);
    expect(datasetChanges.removed).toBe(undefined);
  });
});
