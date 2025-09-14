/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  BaseTraverserTypes,
  TraverserTypes,
} from "../../../traverser/TraverserTypes.js";
import type { InstanceGraph } from "../../../instanceGraph/InstanceGraph.js";
import type { Transformers } from "../../Transformers.js";
import type { CircularDepenedencyAwaiter } from "./CircularDependencyAwaiter.js";
import type { MultiMap } from "./MultiMap.js";
import type { SuperPromise } from "./SuperPromise.js";
import type {
  BaseReturnType,
  TransformerReturnTypes,
} from "../../TransformerReturnTypes.js";
import type { TraverserDefinitions } from "../../../traverser/TraverserDefinition.js";
import type { KeyTypes } from "../../../UtilTypes.js";

export type TransformerSubTraverser<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  ReturnTypes extends TransformerReturnTypes<Types>,
  Type extends BaseTraverserTypes<keyof Types>,
  ReturnType extends BaseReturnType<Types, TypeName>,
  Context,
> = (
  item: Type["type"],
  itemTypeName: TypeName,
  globals: TransformerSubTraverserGlobals<Types, ReturnTypes, Context>,
) => Promise<ReturnType["return"]>;

export interface TransformerSubTraverserGlobals<
  Types extends TraverserTypes<any>,
  ReturnTypes extends TransformerReturnTypes<Types>,
  Context,
> {
  traverserDefinition: TraverserDefinitions<Types>;
  transformers: Transformers<Types, ReturnTypes, Context>;
  executingPromises: TransformerSubTraverserExecutingPromises<keyof Types>;
  circularDependencyAwaiter: CircularDepenedencyAwaiter;
  superPromise: SuperPromise;
  instanceGraph: InstanceGraph<Types>;
  context: Context;
}

export type TransformerSubTraverserExecutingPromises<
  Keys extends KeyTypes = KeyTypes,
> = MultiMap<object, Keys, { promise: Promise<any>; isResolved: boolean }>;
