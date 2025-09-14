import type { CompactShapeType, LdoCompactBase } from "@ldo/ldo";
import type { Patch } from "ng-signals/connector/applyDiff";
import type { Shape } from "ng-signals/types";

/** The Scope of a shape request */
export type Scope = string | string[];

/** The diff format used to communicate updates between wasm-land and js-land. */
export type Diff = Patch[];

export type ObjectState = object;

/** A connection established between wasm-land and js-land for subscription of a shape. */
export type WasmConnection<T extends LdoCompactBase = LdoCompactBase> = {
  id: string;
  shape: CompactShapeType<T>;
  state: ObjectState;
  callback: (diff: Diff, connectionId: WasmConnection["id"]) => void;
};
