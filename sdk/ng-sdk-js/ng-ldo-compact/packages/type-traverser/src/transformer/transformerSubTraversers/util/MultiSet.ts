/**
 * A Multi-Set is a set where two items occupy a unique spot
 */

export class MultiSet<Key1, Key2> {
  private map: Map<Key1, Set<Key2>> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  private internalSize: number = 0;

  add(key1: Key1, key2: Key2): void {
    let nestedSet = this.map.get(key1);
    if (!nestedSet) {
      nestedSet = new Set();
      this.map.set(key1, nestedSet);
    }
    if (!nestedSet.has(key2)) {
      this.internalSize++;
    }
    nestedSet.add(key2);
  }
  has(key1: Key1, key2: Key2): boolean {
    const firstValue = this.map.get(key1);
    if (!firstValue) {
      return false;
    }
    return firstValue.has(key2);
  }
  delete(key1: Key1, key2: Key2): void {
    const nestedSet = this.map.get(key1);
    if (!nestedSet) {
      return;
    }
    if (nestedSet.has(key2)) {
      this.internalSize--;
    }
    nestedSet.delete(key2);
    if (nestedSet.size === 0) {
      this.map.delete(key1);
    }
  }
  get size() {
    return this.internalSize;
  }
  clone(): MultiSet<Key1, Key2> {
    const newMultiSet = new MultiSet<Key1, Key2>();
    this.map.forEach((key2Set, key1) => {
      key2Set.forEach((key2) => {
        newMultiSet.add(key1, key2);
      });
    });
    return newMultiSet;
  }
  toString(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    key1Transformer: (key: Key1) => any = (key) => key,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    key2Transformer: (key: Key2) => any = (key) => key,
  ) {
    const multiSetValues: string[] = [];
    this.forEach((item1, item2) => {
      multiSetValues.push(
        `(${key1Transformer(item1)},${key2Transformer(item2)})`,
      );
    });
    return `${multiSetValues.join(",")}`;
  }
  forEach(callback: (key1: Key1, key2: Key2) => void) {
    this.map.forEach((key2Set, key1) => {
      key2Set.forEach((key2) => {
        callback(key1, key2);
      });
    });
  }
}
