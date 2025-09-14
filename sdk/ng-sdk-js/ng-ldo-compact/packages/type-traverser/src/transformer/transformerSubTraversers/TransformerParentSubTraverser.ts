/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BaseTraverserTypes, TraverserTypes } from "../../index.js";
import type {
  BaseReturnType,
  TransformerReturnTypes,
} from "../TransformerReturnTypes.js";
import { transformerInterfaceSubTraverser } from "./TransformerInterfaceSubTraverser.js";
import { transformerPrimitiveSubTraverser } from "./TransformerPrimitiveSubTraverser.js";
import { transformerUnionSubTraverser } from "./TransformerUnionSubTraverser.js";
import type {
  TransformerSubTraverser,
  TransformerSubTraverserGlobals,
} from "./util/transformerSubTraverserTypes.js";
import { timeout } from "./util/timeout.js";

const subTraversers: Record<
  string,
  TransformerSubTraverser<any, any, any, any, any, any>
> = {
  interface: transformerInterfaceSubTraverser,
  union: transformerUnionSubTraverser,
  primitive: transformerPrimitiveSubTraverser,
};

export async function transformerParentSubTraverser<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  ReturnTypes extends TransformerReturnTypes<Types>,
  Type extends BaseTraverserTypes<keyof Types>,
  ReturnType extends BaseReturnType<Types, TypeName>,
  Context,
>(
  item: Type["type"],
  itemTypeName: TypeName,
  globals: TransformerSubTraverserGlobals<Types, ReturnTypes, Context>,
): Promise<ReturnType["return"]> {
  const { traverserDefinition, executingPromises } = globals;
  if (executingPromises.has(item, itemTypeName)) {
    return executingPromises.get(item, itemTypeName)?.promise;
  }
  const subTraverser: TransformerSubTraverser<
    Types,
    TypeName,
    ReturnTypes,
    Type,
    ReturnType,
    Context
  > = subTraversers[traverserDefinition[itemTypeName].kind];
  const executingPromise = {
    promise: (async () => {
      // This timeout exists to ensure that this promise is recorded
      // in executing promises before we continue traversing.
      await timeout(0);
      return subTraverser(item, itemTypeName, globals);
    })(),
    isResolved: false,
  };
  executingPromises.set(item, itemTypeName, executingPromise);
  const toReturn = await executingPromise.promise;
  executingPromise.isResolved = true;
  return toReturn;
}
