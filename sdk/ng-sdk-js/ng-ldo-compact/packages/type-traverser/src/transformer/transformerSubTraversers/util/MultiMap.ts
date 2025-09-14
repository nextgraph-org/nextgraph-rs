/**
 * A Multi-Map is a map between the tuple of two items and a value
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export class MultiMap<Key1, Key2, Value> {
  private map: Map<Key1, Map<Key2, Value>> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  private internalSize: number = 0;

  get(key1: Key1, key2: Key2): Value | undefined {
    const firstValue = this.map.get(key1);
    if (!firstValue) {
      return undefined;
    }
    return firstValue.get(key2);
  }
  set(key1: Key1, key2: Key2, value: Value): void {
    let nestedMap = this.map.get(key1);
    if (!nestedMap) {
      nestedMap = new Map();
      this.map.set(key1, nestedMap);
    }
    if (!nestedMap.has(key2)) {
      this.internalSize++;
    }
    nestedMap.set(key2, value);
  }
  delete(key1: Key1, key2: Key2): void {
    const nestedMap = this.map.get(key1);
    if (!nestedMap) {
      return;
    }
    if (nestedMap.has(key2)) {
      this.internalSize--;
    }
    nestedMap.delete(key2);
    if (nestedMap.size === 0) {
      this.map.delete(key1);
    }
  }
  has(key1: Key1, key2: Key2): boolean {
    const firstValue = this.map.get(key1);
    if (!firstValue) {
      return false;
    }
    return firstValue.has(key2);
  }
  toString(
    key1Transformer: (key: Key1) => any = (key) => key,
    key2Transformer: (key: Key2) => any = (key) => key,
    valueTransformer: (value: Value) => any = (value) => value,
  ): string {
    let str = "";
    Array.from(this.map.entries()).forEach(([key1, value1]) => {
      Array.from(value1.entries()).forEach(([key2, value2]) => {
        str += `  [${key1Transformer(key1)}, ${key2Transformer(
          key2,
        )}] => ${valueTransformer(value2)}\n`;
      });
    });
    return str;
  }
  get size() {
    return this.internalSize;
  }
}
