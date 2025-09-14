/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * An abract representation for a set of Linked Data Objects
 */
export interface LdSet<T> extends Set<T> {
  /**
   * ===========================================================================
   * BASE METHODS
   * ===========================================================================
   */
  /**
   * Appends a new element with a specified value to the end of the Set.
   */
  add(value: T): this;
  /**
   * Clears this set of all values, but keeps the values in the datastore
   */
  clear(): void;
  /**
   * Removes a specified value from the Set.
   * @returns Returns true if an element in the Set existed and has been removed, or false if the element does not exist.
   */
  delete(value: T): boolean;
  /**
   * @returns a boolean indicating whether an element with the specified value exists in the Set or not.
   */
  has(value: T): boolean;
  /**
   * @returns the number of (unique) elements in Set.
   */
  readonly size: number;
  /** Iterates over values in the set. */
  [Symbol.iterator](): IterableIterator<T>;
  /**
   * Returns an iterable of [v,v] pairs for every value `v` in the set.
   */
  entries(): IterableIterator<[T, T]>;
  /**
   * Despite its name, returns an iterable of the values in the set.
   */
  keys(): IterableIterator<T>;
  /**
   * Returns an iterable of values in the set.
   */
  values(): IterableIterator<T>;
  /**
   * ===========================================================================
   * ITERATOR METHODS
   * These methods mimic array methods
   * ===========================================================================
   */
  /**
   * Determines whether all the members of an set satisfy the specified test.
   * @param predicate A function that accepts up to two arguments. The every method calls
   * the predicate function for each element in the set until the predicate returns a value
   * which is coercible to the Boolean value false, or until the end of the set.
   * @param thisArg An object to which the this keyword can refer in the predicate function.
   * If thisArg is omitted, undefined is used as the this value.
   */
  every<S extends T>(
    predicate: (value: T, set: LdSet<T>) => value is S,
    thisArg?: any,
  ): this is LdSet<S>;
  /**
   * Determines whether all the members of an set satisfy the specified test.
   * @param predicate A function that accepts up to two arguments. The every method calls
   * the predicate function for each element in the set until the predicate returns a value
   * which is coercible to the Boolean value false, or until the end of the set.
   * @param thisArg An object to which the this keyword can refer in the predicate function.
   * If thisArg is omitted, undefined is used as the this value.
   */
  every(
    predicate: (value: T, set: LdSet<T>) => unknown,
    thisArg?: any,
  ): boolean;
  /**
   * Determines whether the specified callback function returns true for any element of a set.
   * @param predicate A function that accepts up to two arguments. The some method calls
   * the predicate function for each element in the set until the predicate returns a value
   * which is coercible to the Boolean value true, or until the end of the set.
   * @param thisArg An object to which the this keyword can refer in the predicate function.
   * If thisArg is omitted, undefined is used as the this value.
   */
  some(predicate: (value: T, set: LdSet<T>) => unknown, thisArg?: any): boolean;
  /**
   * Performs the specified action for each element in an set.
   * @param callbackfn  A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the set. A "value2" is provided for parity with the base set.
   * @param thisArg  An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
   */
  forEach(
    callbackfn: (value: T, value2: T, set: LdSet<T>) => void,
    thisArg?: any,
  ): void;
  /**
   * Calls a defined callback function on each element of an set, and returns a set that contains the results.
   * @param callbackfn A function that accepts up to two arguments. The map method calls the callbackfn function one time for each element in the set.
   * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
   */
  map<U>(callbackfn: (value: T, set: LdSet<T>) => U, thisArg?: any): U[];
  /**
   * Returns the elements of a set that meet the condition specified in a callback function.
   * @param predicate A function that accepts up to two arguments. The filter method calls the predicate function one time for each element in the set.
   * @param thisArg An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.
   */
  filter<S extends T>(
    predicate: (value: T, set: LdSet<T>) => value is S,
    thisArg?: any,
  ): LdSet<S>;
  /**
   * Returns the elements of a set that meet the condition specified in a callback function.
   * @param predicate A function that accepts up to two arguments. The filter method calls the predicate function one time for each element in the set.
   * @param thisArg An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.
   */
  filter(
    predicate: (value: T, set: LdSet<T>) => unknown,
    thisArg?: any,
  ): LdSet<T>;
  /**
   * Calls the specified callback function for all the elements in a set. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
   * @param callbackfn A function that accepts up to three arguments. The reduce method calls the callbackfn function one time for each element in the set.
   * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
   */
  reduce(
    callbackfn: (previousValue: T, currentValue: T, set: LdSet<T>) => T,
  ): T;
  /**
   * Calls the specified callback function for all the elements in a set. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
   * @param callbackfn A function that accepts up to three arguments. The reduce method calls the callbackfn function one time for each element in the set.
   * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
   */
  reduce(
    callbackfn: (previousValue: T, currentValue: T, set: LdSet<T>) => T,
    initialValue: T,
  ): T;
  /**
   * Calls the specified callback function for all the elements in a set. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
   * @param callbackfn A function that accepts up to three arguments. The reduce method calls the callbackfn function one time for each element in the set.
   * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
   */
  reduce<U>(
    callbackfn: (previousValue: U, currentValue: T, array: LdSet<T>) => U,
    initialValue: U,
  ): U;

  /**
   * Converts the current LdSet to an array.
   */
  toArray(): T[];

  /**
   * Converts to JSON
   */
  toJSON(): T[];

  /**
   * ===========================================================================
   * EXTENDED SET METHODS
   * ===========================================================================
   */
  /**
   * Returns a new set containing elements in this set but not in the given set.
   */
  difference(other: Set<T>): LdSet<T>;
  /**
   * returns a new set containing elements in both this set and the given set.
   */
  intersection(other: Set<T>): LdSet<T>;
  /**
   * Returns a boolean indicating if this set has no elements in common with the given set.
   */
  isDisjointFrom(other: Set<T>): boolean;
  /**
   * Returns a boolean indicating if all elements of this set are in the given set.
   */
  isSubsetOf(other: Set<T>): boolean;
  /**
   * Returns a boolean indicating if all elements of the given set are in this set.
   */
  isSupersetOf(other: Set<T>): boolean;
  /**
   * Returns a new set containing elements which are in either this set or the given set, but not in both.
   */
  symmetricDifference(other: Set<T>): LdSet<T>;
  /**
   * Returns a new set containing elements which are in either or both of this set and the given set.
   */
  union(other: Set<T>): LdSet<T>;
}
