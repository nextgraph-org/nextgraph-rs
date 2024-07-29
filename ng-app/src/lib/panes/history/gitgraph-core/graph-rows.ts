import type { Commit } from "./commit";

import { RegularGraphRows } from "./regular-graph-rows";

export { createGraphRows, RegularGraphRows as GraphRows };

function createGraphRows<TNode>(
  commits: Array<Commit<TNode>>,
) {
  return new RegularGraphRows(commits);
}
