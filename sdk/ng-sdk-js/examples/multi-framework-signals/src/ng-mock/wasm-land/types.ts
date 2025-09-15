import type { ShapeType, OrmBase } from "@nextgraph-monorepo/ng-shex-orm";
import type { Patch } from "@nextgraph-monorepo/ng-signals";

/** The Scope of a shape request */
export type Scope = string | string[];

/** The diff format used to communicate updates between wasm-land and js-land. */
export type Diff = Patch[];

export type ObjectState = object;

/** A connection established between wasm-land and js-land for subscription of a shape. */
export type WasmConnection<T extends OrmBase = OrmBase> = {
    id: string;
    shape: ShapeType<T>;
    state: ObjectState;
    callback: (diff: Diff, connectionId: WasmConnection["id"]) => void;
};
