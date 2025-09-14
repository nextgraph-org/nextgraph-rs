import * as shapeManager from "./shapeManager";
import type { WasmConnection, Diff } from "./types";

export default async function updateShape(
  connectionId: WasmConnection["id"],
  diff: Diff,
) {
  const connection = shapeManager.connections.get(connectionId);
  if (!connection) throw new Error("No Connection found.");

  console.log("BACKEND: Received update request from ", connectionId);

  const newState = shapeManager.applyDiff(connection.state, diff);
  connection.state = newState;

  shapeManager.connections.forEach((con) => {
    // if (con.shape == connection.shape) {
    //   con.state = newState;
    //   con.callback(diff, con.id);
    // }
  });
}
