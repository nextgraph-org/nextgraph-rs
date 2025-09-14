import { quad, namedNode, literal } from "@ldo/rdf-utils";
import type { BaseQuad, Dataset, DatasetFactory, Quad } from "@rdfjs/types";
import type { SubjectNode, ObjectNode, PredicateNode } from "@ldo/rdf-utils";
import { Readable } from "stream";

export default function testDataset(
  datasetFactory: DatasetFactory<Quad>,
): void {
  describe("Standard Dataset Test", () => {
    let dataset: Dataset<Quad>;

    beforeEach(() => {
      dataset = datasetFactory.dataset();
    });

    const initializeDataset = () => {
      dataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://example.org/cartoons#name"),
          literal("Tom"),
        ),
      ]);
    };

    it("Adds a quad", () => {
      const addedQuad = quad(
        namedNode("http://example.org/cartoons#Tom"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://example.org/cartoons#Cat"),
      );
      dataset.add(addedQuad);
      expect(dataset.has(addedQuad)).toBe(true);
    });

    it("Deletes a quad", () => {
      initializeDataset();
      const deletedQuad = quad(
        namedNode("http://example.org/cartoons#Tom"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://example.org/cartoons#Cat"),
      );
      dataset.delete(deletedQuad);
      expect(dataset.has(deletedQuad)).toBe(false);
    });

    it("Checks if it has a quad when it does", () => {
      initializeDataset();
      const hadQuad = quad(
        namedNode("http://example.org/cartoons#Tom"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://example.org/cartoons#Cat"),
      );
      expect(dataset.has(hadQuad)).toBe(true);
    });

    it("Checks if it has a quad when it doesn't", () => {
      initializeDataset();
      const hadQuad = quad(
        namedNode("http://fake.com"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://example.org/cartoons#Cat"),
      );
      expect(dataset.has(hadQuad)).toBe(false);
    });

    it("Can match a quad", () => {
      initializeDataset();
      const matchDataset = dataset.match(
        null,
        namedNode("http://example.org/cartoons#name"),
        null,
      );
      expect(
        matchDataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://example.org/cartoons#name"),
            literal("Tom"),
          ),
        ),
      ).toBe(true);
    });

    it("Iterates over itself", () => {
      const quads: Quad[] = [];
      initializeDataset();
      for (const curQuad of dataset) {
        quads.push(curQuad);
      }
      expect(quads.length).toBe(2);
    });

    it("Adds an array of Quads", () => {
      const quads = [
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://example.org/cartoons#name"),
          literal("Tom"),
        ),
      ];
      dataset.addAll(quads);
      expect(dataset.has(quads[0])).toBe(true);
      expect(dataset.has(quads[1])).toBe(true);
    });

    it("Detects if one dataset contains another when it does", () => {
      initializeDataset();
      const containedDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      expect(dataset.contains(containedDataset)).toBe(true);
    });

    it("Detects if one dataset contains another when it doesn't", () => {
      initializeDataset();
      const containedDataset = datasetFactory.dataset([
        quad(
          namedNode("http://fake.com"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      expect(dataset.contains(containedDataset)).toBe(false);
    });

    it("Datects if one dataset contains another when it does and other is empty", () => {
      initializeDataset();
      const containedDataset = datasetFactory.dataset();
      expect(dataset.contains(containedDataset)).toBe(true);
    });

    it("Datects if one dataset contains another when it doesn't and this is empty", () => {
      const containedDataset = datasetFactory.dataset([
        quad(
          namedNode("http://fake.com"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      expect(dataset.contains(containedDataset)).toBe(false);
    });

    it("Datects if one dataset contains another when it does and this and other are empty", () => {
      const containedDataset = datasetFactory.dataset();
      expect(dataset.contains(containedDataset)).toBe(true);
    });

    it("Detects if one dataset contains another when it doesn't", () => {
      initializeDataset();
      const containedDataset = datasetFactory.dataset([
        quad(
          namedNode("http://fake.com"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      expect(dataset.contains(containedDataset)).toBe(false);
    });

    it("Detects if one dataset contains another when the given dataset is larger", () => {
      initializeDataset();
      const containedDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
        quad(
          namedNode("http://example.org/cartoons#Licky"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
        quad(
          namedNode("http://example.org/cartoons#Tulip"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      expect(dataset.contains(containedDataset)).toBe(false);
    });

    it("Deletes matching quads", () => {
      initializeDataset();
      dataset.deleteMatches(
        undefined,
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        undefined,
      );
      expect(
        dataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
        ),
      ).toBe(false);
    });

    it("Finds the difference between two datasets", () => {
      initializeDataset();
      const otherDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      const differenceDataset = dataset.difference(otherDataset);
      expect(
        differenceDataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
        ),
      ).toBe(false);
      expect(
        differenceDataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://example.org/cartoons#name"),
            literal("Tom"),
          ),
        ),
      ).toBe(true);
    });

    it("Checks if datasets are equal when they are", () => {
      initializeDataset();
      const otherDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://example.org/cartoons#name"),
          literal("Tom"),
        ),
      ]);
      expect(dataset.equals(otherDataset)).toBe(true);
    });

    it("Checks if datasets are equal when they aren't", () => {
      initializeDataset();
      const otherDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Licky"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
        quad(
          namedNode("http://example.org/cartoons#Licky"),
          namedNode("http://example.org/cartoons#name"),
          literal("Tom"),
        ),
      ]);
      expect(dataset.equals(otherDataset)).toBe(false);
    });

    it("Checks if datasets are equal when they aren't and don't have the same size", () => {
      initializeDataset();
      const otherDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      expect(dataset.equals(otherDataset)).toBe(false);
    });

    it("Checks if datasets are equal when they aren't and other dataset is empty", () => {
      initializeDataset();
      const otherDataset = datasetFactory.dataset();
      expect(dataset.equals(otherDataset)).toBe(false);
    });

    it("Checks if datasets are equal when they aren't and this dataset is empty", () => {
      const otherDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      expect(dataset.equals(otherDataset)).toBe(false);
    });

    it("Checks if datasets are equal when they are and this and other datasets are empty", () => {
      const otherDataset = datasetFactory.dataset();
      expect(dataset.equals(otherDataset)).toBe(true);
    });

    it("runs the every function when it should return true", () => {
      initializeDataset();
      expect(dataset.every(() => true)).toBe(true);
    });

    it("runs the every function when it should return false", () => {
      initializeDataset();
      expect(dataset.every(() => false)).toBe(false);
    });

    it("runs filter", () => {
      initializeDataset();
      const newDataset = dataset.filter(
        (curQuad) =>
          curQuad.predicate.value ===
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      );
      expect(newDataset.size).toBe(1);
      expect(
        newDataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
        ),
      ).toBe(true);
    });

    it("runs forEach", () => {
      initializeDataset();
      const quads: BaseQuad[] = [];
      dataset.forEach((curQuad) => {
        quads.push(curQuad);
      });
      expect(
        quads[0].equals(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
        ),
      ).toBe(true);
      expect(
        quads[1].equals(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://example.org/cartoons#name"),
            literal("Tom"),
          ),
        ),
      ).toBe(true);
    });

    it("Imports quads from a stream", async () => {
      const stream = datasetFactory
        .dataset([
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://example.org/cartoons#name"),
            literal("Tom"),
          ),
        ])
        .toStream();
      await dataset.import(stream);
      expect(
        dataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
        ),
      ).toBe(true);
      expect(
        dataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://example.org/cartoons#name"),
            literal("Tom"),
          ),
        ),
      ).toBe(true);
    });

    it("Rejects import stream if stream errors", async () => {
      const badStream = new Readable({
        read() {
          this.emit("error", new Error("This is a bad stream."));
        },
      });
      await expect(dataset.import(badStream)).rejects.toThrow(
        "This is a bad stream.",
      );
    });

    it("finds the intersection when this is bigger", () => {
      initializeDataset();
      const otherDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      const intersectionDataset = dataset.intersection(otherDataset);
      expect(intersectionDataset.size).toBe(1);
      expect(
        intersectionDataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
        ),
      ).toBe(true);
    });

    it("finds the intersection when other is bigger", () => {
      initializeDataset();
      const otherDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
        quad(
          namedNode("http://fake1.com"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
        quad(
          namedNode("http://fake2.com"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      const intersectionDataset = dataset.intersection(otherDataset);
      expect(intersectionDataset.size).toBe(1);
      expect(
        intersectionDataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
        ),
      ).toBe(true);
    });

    it("Maps the dataset", () => {
      initializeDataset();
      const mappedDataset = dataset.map((curQuad) => {
        return quad(
          curQuad.predicate as SubjectNode,
          curQuad.predicate as PredicateNode,
          curQuad.predicate as ObjectNode,
        );
      });
      expect(mappedDataset.size).toBe(2);
      expect(
        mappedDataset.has(
          quad(
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          ),
        ),
      ).toBe(true);
      expect(
        mappedDataset.has(
          quad(
            namedNode("http://example.org/cartoons#name"),
            namedNode("http://example.org/cartoons#name"),
            namedNode("http://example.org/cartoons#name"),
          ),
        ),
      ).toBe(true);
    });

    it("Reduces the dataset", () => {
      initializeDataset();
      const reducedSubjects = dataset.reduce((agg, curQuad) => {
        return `${agg}${curQuad.subject.value}`;
      }, "");
      expect(reducedSubjects).toBe(
        "http://example.org/cartoons#Tomhttp://example.org/cartoons#Tom",
      );
    });

    it("Reduces an empty dataset", () => {
      const reducedSubjects = dataset.reduce((agg, curQuad) => {
        return `${agg}${curQuad.subject.value}`;
      }, "");
      expect(reducedSubjects).toBe("");
    });

    it("Throws an error if reduce is called on an empty dataset without an initial value", () => {
      expect(() =>
        dataset.reduce(() => {
          /* Do nothing */
        }),
      ).toThrow("Cannot reduce an empty Dataset without an initial value.");
    });

    it("Determines of some quad satifies an iteratee when it does", () => {
      initializeDataset();
      expect(
        dataset.some(
          (curQuad) =>
            curQuad.predicate.value === "http://example.org/cartoons#name",
        ),
      ).toBe(true);
    });

    it("Determines of some quad satifies an iteratee when it doesn't", () => {
      initializeDataset();
      expect(
        dataset.some(
          (curQuad) => curQuad.predicate.value === "http://fake.com",
        ),
      ).toBe(false);
    });

    it("Converts the dataset into an array", () => {
      initializeDataset();
      const arr = dataset.toArray();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(2);
      expect(arr[0].predicate.value).toBe(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      );
      expect(arr[1].predicate.value).toBe("http://example.org/cartoons#name");
    });

    it("Converts the empty dataset into an empty array", () => {
      const arr = dataset.toArray();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(0);
    });

    it("Throws a not implemented error for toCononical", () => {
      expect(() => dataset.toCanonical()).toThrow("Method not implemented.");
    });

    it("Streams itself", async () => {
      initializeDataset();
      return new Promise<void>((resolve, reject) => {
        const stream = dataset.toStream();
        const onDataFunc = jest.fn();
        stream.on("data", onDataFunc);
        stream.on("error", reject);
        stream.on("end", () => {
          expect(onDataFunc).toBeCalledTimes(2);
          resolve();
        });
      });
    });

    it("successfully runs toString", () => {
      initializeDataset();
      const stringified = dataset.toString();
      expect(stringified).toBe(
        `<http://example.org/cartoons#Tom> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Cat> .\n<http://example.org/cartoons#Tom> <http://example.org/cartoons#name> "Tom" .\n`,
      );
    });

    it("runs toString and gets a compliant N-Triple", () => {
      const dataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("https://example.org/age"),
          literal("6", "http://www.w3.org/2001/XMLSchema#integer"),
        ),
      ]);
      expect(dataset.toString()).toBe(
        '<http://example.org/cartoons#Tom> <https://example.org/age> "6"^^<http://www.w3.org/2001/XMLSchema#integer> .\n',
      );
    });

    it("Finds a union", () => {
      initializeDataset();
      const otherDataset = datasetFactory.dataset([
        quad(
          namedNode("http://example.org/cartoons#Licky"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
        quad(
          namedNode("http://example.org/cartoons#Tom"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://example.org/cartoons#Cat"),
        ),
      ]);
      const unionDataset = dataset.union(otherDataset);
      expect(unionDataset.size).toBe(3);
      expect(
        unionDataset.has(
          quad(
            namedNode("http://example.org/cartoons#Licky"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
        ),
      ).toBe(true);
      expect(
        unionDataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://example.org/cartoons#Cat"),
          ),
        ),
      ).toBe(true);
      expect(
        unionDataset.has(
          quad(
            namedNode("http://example.org/cartoons#Tom"),
            namedNode("http://example.org/cartoons#name"),
            literal("Tom"),
          ),
        ),
      ).toBe(true);
    });
  });
}
