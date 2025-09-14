import type { Patch } from "./connector/applyDiff";

/** The shape of an object requested. */
export type Shape = "Shape1" | "Shape2" | "TestShape";

/** The Scope of a shape request */
export type Scope = string | string[];

/** The diff format used to communicate updates between wasm-land and js-land. */
export type Diff = Patch[];

/** A connection established between wasm-land and js-land for subscription of a shape. */
export type Connection = {
  id: string;
  onUpdateFromWasm: (diff: Diff) => void;
};
