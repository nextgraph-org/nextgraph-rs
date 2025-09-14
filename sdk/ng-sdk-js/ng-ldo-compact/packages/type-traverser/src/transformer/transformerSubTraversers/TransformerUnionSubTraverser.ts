/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TraverserTypes } from "../../index.js";
import type { UnionInstanceNode } from "../../instanceGraph/nodes/UnionInstanceNode.js";
import type {
  TransformerReturnTypes,
  UnionReturnType,
} from "../TransformerReturnTypes.js";
import type { UnionTransformerDefinition } from "../Transformers.js";
import type { UnionTraverserDefinition } from "../../traverser/TraverserDefinition.js";
import type { UnionType } from "../../traverser/TraverserTypes.js";
import { transformerParentSubTraverser } from "./TransformerParentSubTraverser.js";
import type { TransformerSubTraverserGlobals } from "./util/transformerSubTraverserTypes.js";

export async function transformerUnionSubTraverser<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  ReturnTypes extends TransformerReturnTypes<Types>,
  Type extends UnionType<keyof Types> & Types[TypeName],
  ReturnType extends UnionReturnType,
  Context,
>(
  item: Type["type"],
  itemTypeName: TypeName,
  globals: TransformerSubTraverserGlobals<Types, ReturnTypes, Context>,
): Promise<ReturnType["return"]> {
  const {
    traverserDefinition,
    transformers,
    circularDependencyAwaiter,
    executingPromises,
    superPromise,
  } = globals;
  const resolveSuperPromise = superPromise.add();
  return new Promise<ReturnType["return"]>(async (resolve, reject) => {
    try {
      const definition = traverserDefinition[
        itemTypeName
      ] as UnionTraverserDefinition<Type>;
      const transformer = transformers[
        itemTypeName
      ] as unknown as UnionTransformerDefinition<
        Types,
        TypeName,
        Type,
        ReturnTypes,
        ReturnType,
        Context
      >;
      const transformedObject = await transformer(
        item,
        async () => {
          const itemSpecificTypeName = definition.selector(item);
          const onResolve = circularDependencyAwaiter.add(
            item,
            itemTypeName,
            item,
            itemSpecificTypeName,
            executingPromises,
          );
          const toReturn = await transformerParentSubTraverser(
            item,
            itemSpecificTypeName,
            globals,
          );
          onResolve();
          return toReturn;
        },
        (input) => {
          resolve(input);
        },
        globals.instanceGraph.getNodeFor(
          item,
          itemTypeName,
        ) as unknown as UnionInstanceNode<Types, TypeName, Type>,
        globals.context,
      );
      resolve(transformedObject);
      resolveSuperPromise();
    } catch (err) {
      reject(err);
      resolveSuperPromise(err);
    }
  });
}
