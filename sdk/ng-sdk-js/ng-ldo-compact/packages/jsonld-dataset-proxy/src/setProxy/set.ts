import type { RawValue } from "../util/RawObject.js";
import { BasicLdSet } from "./ldSet/BasicLdSet.js";
import type { LdSet } from "./ldSet/LdSet.js";

/**
 * Creates an LdSet used by LDO as a list of items.
 * @param values The list of items in the set
 * @returns An LdSet
 */
export function set<T>(...values: T[]): LdSet<T> {
  return new BasicLdSet(
    values as Iterable<NonNullable<RawValue>>,
  ) as unknown as LdSet<T>;
}
