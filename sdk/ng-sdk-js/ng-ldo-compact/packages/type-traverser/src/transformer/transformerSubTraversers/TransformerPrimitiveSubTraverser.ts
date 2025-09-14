/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TraverserTypes } from "../../index.js";
import type { PrimitiveInstanceNode } from "../../instanceGraph/nodes/PrimitiveInstanceNode.js";
import type {
  PrimitiveReturnType,
  TransformerReturnTypes,
} from "../TransformerReturnTypes.js";
import type { PrimitiveTransformerDefinition } from "../Transformers.js";
import type { PrimitiveType } from "../../traverser/TraverserTypes.js";
import type { TransformerSubTraverserGlobals } from "./util/transformerSubTraverserTypes.js";

export async function transformerPrimitiveSubTraverser<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  ReturnTypes extends TransformerReturnTypes<Types>,
  Type extends PrimitiveType & Types[TypeName],
  ReturnType extends PrimitiveReturnType,
  Context,
>(
  item: Type["type"],
  itemTypeName: TypeName,
  globals: TransformerSubTraverserGlobals<Types, ReturnTypes, Context>,
): Promise<ReturnType["return"]> {
  const { transformers } = globals;
  const transformer = transformers[
    itemTypeName
  ] as unknown as PrimitiveTransformerDefinition<
    Types,
    TypeName,
    Type,
    ReturnType,
    Context
  >;
  return transformer(
    item,
    globals.instanceGraph.getNodeFor(
      item,
      itemTypeName,
    ) as unknown as PrimitiveInstanceNode<Types, TypeName, Type>,
    globals.context,
  );
}
