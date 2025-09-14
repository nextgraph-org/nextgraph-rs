import { namedNode } from "@ldo/rdf-utils";
import jsonldDatasetProxy, {
  BasicLdSet,
  _getUnderlyingNode,
} from "../src/index.js";
import { createDataset } from "@ldo/dataset";

describe("BasicLdSet", () => {
  describe("constructor and add", () => {
    test("should add primitive values correctly", () => {
      const set = new BasicLdSet<number>();
      expect(set.size).toBe(0);
      set.add(1);
      expect(set.size).toBe(1);
      expect(set.has(1)).toBe(true);
      // Duplicate primitives should not increase size.
      set.add(1);
      expect(set.size).toBe(1);
    });

    test('should add objects with "@id" as string correctly', () => {
      const obj1 = { "@id": "testId" };
      const set = new BasicLdSet();
      set.add(obj1);
      expect(set.has(obj1)).toBe(true);
      expect(set.size).toBe(1);
      // A different object with the same "@id" should be considered a duplicate.
      const obj2 = { "@id": "testId" };
      set.add(obj2);
      expect(set.size).toBe(1);
    });

    test('should add objects with "@id" as an object correctly', () => {
      // In this case the object’s "@id" is a string already.
      const obj1 = { "@id": "testIdObj" };
      const set = new BasicLdSet();
      set.add(obj1);
      expect(set.has(obj1)).toBe(true);
      expect(set.size).toBe(1);
      // A different object with an equivalent "@id" should not increase the size.
      const obj2 = { "@id": "testIdObj" };
      set.add(obj2);
      expect(set.size).toBe(1);
    });

    test("should add LinkedDataObject", () => {
      // In this case the object’s "@id" is a string already.
      const obj1 = jsonldDatasetProxy(createDataset(), {}).fromSubject(
        namedNode("testIdObj"),
      );
      const set = new BasicLdSet();
      set.add(obj1);
      expect(set.has(obj1)).toBe(true);
      expect(set.size).toBe(1);
      // A different object with an equivalent "@id" should not increase the size.
      const obj2 = { "@id": "testIdObj" };
      set.add(obj2);
      expect(set.size).toBe(1);
    });

    test("should add objects with underlying nodes correctly", () => {
      // Here we simulate a case where the object has a NamedNode stored as its "@id"
      // which in turn yields its .value.
      const obj1 = { "@id": namedNode("testIdObj") };
      const set = new BasicLdSet();
      set.add(obj1);
      expect(set.has(obj1)).toBe(true);
      expect(set.size).toBe(1);
      // A different object with an equivalent "@id".value should not increase the size.
      const obj2 = { "@id": "testIdObj" };
      set.add(obj2);
      expect(set.size).toBe(1);
    });

    test('should treat objects with no "@id" as unique even if same reference', () => {
      // When an object does not have "@id" (or _getUnderlyingNode),
      // the hashFn falls back to generating a new blank node each time.
      const obj = {};
      const set = new BasicLdSet();
      set.add(obj);
      // Adding the same object twice produces two different hash keys.
      set.add(obj);
      expect(set.size).toBe(2);
    });

    test("should initialize with iterable values", () => {
      const set = new BasicLdSet<number>([1, 2, 3, 3]);
      expect(set.size).toBe(3);
      expect([...set]).toEqual([1, 2, 3]);
    });
  });

  describe("clear", () => {
    test("should clear all elements", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      expect(set.size).toBe(3);
      set.clear();
      expect(set.size).toBe(0);
      expect([...set]).toEqual([]);
    });
  });

  describe("delete", () => {
    test("should delete an existing element and return true", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      expect(set.delete(2)).toBe(true);
      expect(set.has(2)).toBe(false);
      expect(set.size).toBe(2);
    });

    test("should return false when deleting a non-existent element", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      expect(set.delete(4)).toBe(false);
      expect(set.size).toBe(3);
    });
  });

  describe("has", () => {
    test("should correctly identify the presence of elements", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      expect(set.has(1)).toBe(true);
      expect(set.has(4)).toBe(false);
    });
  });

  describe("iteration functions", () => {
    test("every should return true if all elements satisfy the predicate", () => {
      const set = new BasicLdSet<number>([2, 4, 6]);
      const result = set.every((num) => num % 2 === 0);
      expect(result).toBe(true);
    });

    test("every should return false if any element fails the predicate", () => {
      const set = new BasicLdSet<number>([2, 3, 6]);
      const result = set.every((num) => num % 2 === 0);
      expect(result).toBe(false);
    });

    test("some should return true if any element satisfies the predicate", () => {
      const set = new BasicLdSet<number>([1, 3, 4]);
      const result = set.some((num) => num % 2 === 0);
      expect(result).toBe(true);
    });

    test("some should return false if no element satisfies the predicate", () => {
      const set = new BasicLdSet<number>([1, 3, 5]);
      const result = set.some((num) => num % 2 === 0);
      expect(result).toBe(false);
    });

    test("forEach should call the callback for each element", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      const mockFn = jest.fn();
      set.forEach((value, value2, collection) => {
        expect(collection).toBe(set);
        expect(value).toBe(value2);
        mockFn(value);
      });
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(mockFn).toHaveBeenCalledWith(1);
      expect(mockFn).toHaveBeenCalledWith(2);
      expect(mockFn).toHaveBeenCalledWith(3);
    });

    test("map should return an array with mapped values", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      const result = set.map((num) => num * 2);
      expect(result).toEqual([2, 4, 6]);
    });

    test("filter should return a new set with filtered elements", () => {
      const set = new BasicLdSet<number>([1, 2, 3, 4]);
      const filtered = set.filter((num) => num % 2 === 0);
      expect(filtered.size).toBe(2);
      expect(filtered.has(2)).toBe(true);
      expect(filtered.has(4)).toBe(true);
    });

    test("reduce should work without an initial value", () => {
      const set = new BasicLdSet<number>([1, 2, 3, 4]);
      const result = set.reduce((acc, curr) => acc + curr);
      expect(result).toBe(10);
    });

    test("reduce should work with an initial value", () => {
      const set = new BasicLdSet<number>([1, 2, 3, 4]);
      const result = set.reduce((acc, curr) => acc + curr, 10);
      expect(result).toBe(20);
    });

    test("reduce should throw an error for an empty set without an initial value", () => {
      const set = new BasicLdSet<number>();
      expect(() => {
        set.reduce((acc, curr) => acc + curr);
      }).toThrow("Reduce of empty collection with no initial value");
    });

    test("toArray and toJSON should return an array of elements", () => {
      const elements = [1, 2, 3];
      const set = new BasicLdSet<number>(elements);
      expect(set.toArray()).toEqual(elements);
      expect(set.toJSON()).toEqual(elements);
    });
  });

  describe("set operations", () => {
    test("difference should return elements in the first set not present in the second", () => {
      const set1 = new BasicLdSet<number>([1, 2, 3, 4]);
      const set2 = new Set<number>([3, 4, 5]);
      const diff = set1.difference(set2);
      expect(diff.size).toBe(2);
      expect(diff.has(1)).toBe(true);
      expect(diff.has(2)).toBe(true);
    });

    test("intersection should return only the common elements", () => {
      const set1 = new BasicLdSet<number>([1, 2, 3, 4]);
      const set2 = new BasicLdSet<number>([3, 4, 5]);
      const inter = set1.intersection(set2);
      expect(inter.size).toBe(2);
      expect(inter.has(3)).toBe(true);
      expect(inter.has(4)).toBe(true);
      const inter2 = set2.intersection(set1);
      expect(inter2.size).toBe(2);
      expect(inter2.has(3)).toBe(true);
      expect(inter2.has(4)).toBe(true);
    });

    test("isDisjointFrom should return true if the sets have no common elements", () => {
      const set1 = new BasicLdSet<number>([1, 2]);
      const set2 = new BasicLdSet<number>([3, 4, 5]);
      expect(set1.isDisjointFrom(set2)).toBe(true);
      expect(set2.isDisjointFrom(set1)).toBe(true);
    });

    test("isDisjointFrom should return false if the sets share elements", () => {
      const set1 = new BasicLdSet<number>([1, 2]);
      const set2 = new Set<number>([2, 3]);
      expect(set1.isDisjointFrom(set2)).toBe(false);
    });

    test("isSubsetOf should return true when the set is a subset of another", () => {
      const set1 = new BasicLdSet<number>([1, 2]);
      const set2 = new BasicLdSet<number>([1, 2, 3]);
      expect(set1.isSubsetOf(set2)).toBe(true);
      expect(set2.isSubsetOf(set1)).toBe(false);
    });

    test("isSubsetOf should return false when the set is not a subset of another", () => {
      const set1 = new BasicLdSet<number>([1, 2, 4]);
      const set2 = new Set<number>([1, 2, 3]);
      expect(set1.isSubsetOf(set2)).toBe(false);
    });

    test("isSupersetOf should return true when the set is a superset of another", () => {
      const set1 = new BasicLdSet<number>([1, 2, 3]);
      const set2 = new Set<number>([1, 2]);
      expect(set1.isSupersetOf(set2)).toBe(true);
    });

    test("isSupersetOf should return false when the set is larger", () => {
      const set1 = new BasicLdSet<number>([1, 2]);
      const set2 = new BasicLdSet<number>([1, 2, 3]);
      expect(set1.isSupersetOf(set2)).toBe(false);
    });

    test("isSupersetOf should return false when the set is not a superset of another", () => {
      const set1 = new BasicLdSet<number>([1, 2, 5]);
      const set2 = new BasicLdSet<number>([1, 2, 3]);
      expect(set1.isSupersetOf(set2)).toBe(false);
    });

    test("symmetricDifference should return the symmetric difference of two sets", () => {
      const set1 = new BasicLdSet<number>([1, 2, 3]);
      const set2 = new Set<number>([2, 3, 4]);
      const symDiff = set1.symmetricDifference(set2);
      expect(symDiff.size).toBe(2);
      expect(symDiff.has(1)).toBe(true);
      expect(symDiff.has(4)).toBe(true);
    });

    test("union should return the union of two sets", () => {
      const set1 = new BasicLdSet<number>([1, 2]);
      const set2 = new Set<number>([2, 3]);
      const union = set1.union(set2);
      expect(union.size).toBe(3);
      expect(union.has(1)).toBe(true);
      expect(union.has(2)).toBe(true);
      expect(union.has(3)).toBe(true);
    });
  });

  describe("iterator methods", () => {
    test("entries returns pairs [value, value]", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      const entries = Array.from(set.entries());
      expect(entries).toEqual([
        [1, 1],
        [2, 2],
        [3, 3],
      ]);
    });

    test("keys returns all values", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      const keys = Array.from(set.keys());
      expect(keys).toEqual([1, 2, 3]);
    });

    test("values returns all values", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      const values = Array.from(set.values());
      expect(values).toEqual([1, 2, 3]);
    });

    test("iterator returns all values", () => {
      const set = new BasicLdSet<number>([1, 2, 3]);
      const iterated = [...set];
      expect(iterated).toEqual([1, 2, 3]);
    });

    test("toStringTag returns 'BasicLdSet'", () => {
      const set = new BasicLdSet<number>();
      expect(Object.prototype.toString.call(set)).toBe("[object BasicLdSet]");
      expect(set[Symbol.toStringTag]).toBe("BasicLdSet");
    });
  });
});
