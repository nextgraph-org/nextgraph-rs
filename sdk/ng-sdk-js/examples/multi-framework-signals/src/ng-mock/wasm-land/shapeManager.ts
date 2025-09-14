import type { Diff, ObjectState, WasmConnection } from "./types";

const connections: Map<WasmConnection["id"], WasmConnection> = new Map();

/** Mock function to apply diffs. Just uses a copy of the diff as the new object. */
export function applyDiff(currentState: ObjectState, diff: Diff): ObjectState {
  return JSON.parse(JSON.stringify(diff));
}

export { connections };
