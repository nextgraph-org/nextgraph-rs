/** Lightweight façade adding ergonomic helpers (.value/.peek/.get/.set) to native alien-signals function signals. */
// Native re-exports for advanced usage.
export {
  signal as _rawSignal,
  computed as _rawComputed,
  effect,
  startBatch,
  endBatch,
  getCurrentSub,
  setCurrentSub,
} from "alien-signals";

import {
  signal as alienSignal,
  computed as alienComputed,
  effect as alienEffect,
  startBatch as alienStartBatch,
  endBatch as alienEndBatch,
} from "alien-signals";
import { ReactiveFlags as ReactiveFlags_ } from "./contents";
import { isFunction } from "./utils";

// Nominal constructor removal: we no longer expose classes; signals are plain tagged functions.

/** Internal shape of a tagged writable signal after adding ergonomic helpers. */
type TaggedSignal<T> = ReturnType<typeof alienSignal<T>> & {
  /** Tracking read / write via property syntax */
  value: T;
  /** Non-tracking read */
  peek(): T;
  /** Alias for tracking read */
  get(): T;
  /** Write helper */
  set(v: T): void;
};

/**
 * Decorate a native signal function with legacy helpers & identity.
 */
function tagSignal(fn: any): TaggedSignal<any> {
  Object.defineProperty(fn, ReactiveFlags_.IS_SIGNAL, { value: true });
  Object.defineProperty(fn, "value", {
    get: () => fn(),
    set: (v) => fn(v),
  });
  // Add peek to mirror old API (non-tracking read)
  if (!fn.peek) Object.defineProperty(fn, "peek", { value: () => fn() });
  if (!fn.get) Object.defineProperty(fn, "get", { value: () => fn() });
  if (!fn.set) Object.defineProperty(fn, "set", { value: (v: any) => fn(v) });
  return fn;
}

/**
 * Decorate a native computed function similarly (readonly value accessor).
 */
function tagComputed(fn: any) {
  Object.defineProperty(fn, ReactiveFlags_.IS_SIGNAL, { value: true });
  Object.defineProperty(fn, "value", { get: () => fn() });
  if (!fn.peek) Object.defineProperty(fn, "peek", { value: () => fn() });
  if (!fn.get) Object.defineProperty(fn, "get", { value: () => fn() });
  return fn;
}

/**
 * Create a new writable function-form signal enhanced with `.value`, `.peek()`, `.get()`, `.set()`.
 *
 * @example
 * const count = signal(0);
 * count();      // 0 (track)
 * count(1);     // write
 * count.value;  // 1 (track)
 * count.peek(); // 1 (non-tracking)
 */
export const signal = <T>(v?: T) => tagSignal(alienSignal(v));
/**
 * Create a lazy computed (readonly) signal derived from other signals.
 * The returned function is tagged with `.value` and `.peek()` for convenience.
 */
export const computed = <T>(getter: () => T) =>
  tagComputed(alienComputed(getter));

/** Union allowing a plain value or a writable signal wrapping that value. */
export type MaybeSignal<T = any> = T | ReturnType<typeof signal>;
/** Union allowing value, writable signal, computed signal or plain getter function. */
export type MaybeSignalOrGetter<T = any> =
  | MaybeSignal<T>
  | ReturnType<typeof computed>
  | (() => T);
/** Runtime guard that an unknown value is one of our tagged signals/computeds. */
export const isSignal = (s: any): boolean =>
  typeof s === "function" && !!s && !!s[ReactiveFlags_.IS_SIGNAL];

/**
 * Minimal Effect wrapper for legacy watch implementation.
 * Provides: active, dirty, scheduler hook, run() & stop().
 */
/**
 * Minimal Effect wrapper mimicking the legacy interface used by the watch implementation.
 *
 * Each instance wraps a native alien `effect`, setting `dirty=true` on invalidation and invoking
 * the provided scheduler callback. Consumers may manually `run()` the getter (marks clean) or `stop()`
 * to dispose the underlying reactive subscription.
 */
export class Effect {
  public active = true;
  public dirty = true;
  public scheduler: (immediateFirstRun?: boolean) => void = () => {};
  private _runner: any;
  constructor(private _getter: () => any) {
    const self = this;
    this._runner = alienEffect(function wrapped() {
      self.dirty = true;
      self._getter();
      self.scheduler();
    });
  }
  run() {
    this.dirty = false;
    return this._getter();
  }
  stop() {
    if (this.active) {
      this._runner();
      this.active = false;
    }
  }
}
/** Resolve a plain value, a signal/computed or a getter function to its current value. */
// Lightweight direct resolver (inlined former toValue/unSignal logic)
/**
 * Resolve a possibly reactive input to its current value.
 * Accepts: plain value, writable signal, computed signal, or getter function.
 * Signals & getters are invoked once; plain values are returned directly.
 */
export function toValue<T>(src: MaybeSignalOrGetter<T>): T {
  return isFunction(src)
    ? (src as any)()
    : isSignal(src)
    ? (src as any)()
    : (src as any);
}

/**
 * Execute multiple signal writes in a single batched update frame.
 * All downstream computed/effect re-evaluations are deferred until the function exits.
 *
 * IMPORTANT: The callback MUST be synchronous. If it returns a Promise the batch will
 * still end immediately after scheduling, possibly causing mid-async flushes.
 *
 * @example
 * batch(() => {
 *   count(count() + 1);
 *   other(other() + 2);
 * }); // effects observing both run only once
 */
export function batch<T>(fn: () => T): T {
  alienStartBatch();
  try {
    return fn();
  } finally {
    alienEndBatch();
  }
}
