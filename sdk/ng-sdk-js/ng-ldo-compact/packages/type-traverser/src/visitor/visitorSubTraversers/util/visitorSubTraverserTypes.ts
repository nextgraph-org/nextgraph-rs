/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  BaseTraverserTypes,
  TraverserTypes,
} from "../../../traverser/TraverserTypes.js";
import type { InstanceGraph } from "../../../instanceGraph/InstanceGraph.js";
import type { MultiSet } from "../../../transformer/transformerSubTraversers/util/MultiSet.js";
import type { TraverserDefinitions } from "../../../traverser/TraverserDefinition.js";
import type { Visitors } from "../../Visitors.js";

export type VisitorSubTraverser<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends BaseTraverserTypes<keyof Types>,
  Context,
> = (
  item: Type["type"],
  itemTypeName: TypeName,
  globals: VisitorSubTraverserGlobals<Types, Context>,
) => Promise<void>;

export interface VisitorSubTraverserGlobals<
  Types extends TraverserTypes<any>,
  Context,
> {
  traverserDefinition: TraverserDefinitions<Types>;
  visitors: Visitors<Types, Context>;
  visitedObjects: MultiSet<object, keyof Types>;
  instanceGraph: InstanceGraph<Types>;
  context: Context;
}
