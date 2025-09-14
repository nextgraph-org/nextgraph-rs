/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  PrimitiveVisitorDefinition,
  TraverserTypes,
} from "../../index.js";
import type { PrimitiveInstanceNode } from "../../instanceGraph/nodes/PrimitiveInstanceNode.js";
import type { PrimitiveType } from "../../traverser/TraverserTypes.js";
import type { VisitorSubTraverserGlobals } from "./util/visitorSubTraverserTypes.js";

export async function visitorPrimitiveSubTraverser<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends PrimitiveType & Types[TypeName],
  Context,
>(
  item: Type["type"],
  itemTypeName: TypeName,
  globals: VisitorSubTraverserGlobals<Types, Context>,
): Promise<void> {
  const { visitors } = globals;
  const visitor = visitors[
    itemTypeName
  ] as unknown as PrimitiveVisitorDefinition<Types, TypeName, Type, Context>;
  return visitor(
    item,
    globals.instanceGraph.getNodeFor(
      item,
      itemTypeName,
    ) as unknown as PrimitiveInstanceNode<Types, TypeName, Type>,
    globals.context,
  );
}
