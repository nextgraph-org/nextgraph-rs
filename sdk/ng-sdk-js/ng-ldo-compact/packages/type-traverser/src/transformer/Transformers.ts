/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ApplyTransformerReturnTypesDefaults,
  InterfaceReturnType,
  InterfaceType,
  PrimitiveReturnType,
  PrimitiveType,
  TransformerInputReturnTypes,
  TransformerReturnTypes,
  TraverserTypes,
  UnionReturnType,
  UnionType,
} from "../index.js";
import type { InterfaceInstanceNode } from "../instanceGraph/nodes/InterfaceInstanceNode.js";
import type { PrimitiveInstanceNode } from "../instanceGraph/nodes/PrimitiveInstanceNode.js";
import type { UnionInstanceNode } from "../instanceGraph/nodes/UnionInstanceNode.js";

export type GetTransformedChildrenFunction<TransformedChildrenType> =
  () => Promise<TransformedChildrenType>;

export type SetReturnPointerFunction<ReturnType> = (
  returnPointer: ReturnType,
) => void;

export type InterfaceTransformerFunction<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends InterfaceType<keyof Types> & Types[TypeName],
  ReturnType extends InterfaceReturnType<Type>,
  Context,
> = (
  originalData: Type["type"],
  getTransformedChildren: GetTransformedChildrenFunction<{
    [PropertyName in keyof ReturnType["properties"]]: ReturnType["properties"][PropertyName];
  }>,
  setReturnPointer: SetReturnPointerFunction<ReturnType["return"]>,
  node: InterfaceInstanceNode<Types, TypeName, Type>,
  context: Context,
) => Promise<ReturnType["return"]>;

export type InterfaceTransformerPropertyFunction<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends InterfaceType<keyof Types> & Types[TypeName],
  ReturnTypes extends TransformerReturnTypes<Types>,
  ReturnType extends InterfaceReturnType<Type>,
  PropertyName extends keyof Type["properties"],
  Context,
> = (
  originalData: Types[Type["properties"][PropertyName]]["type"],
  getTransfromedChildren: GetTransformedChildrenFunction<
    ReturnTypes[Type["properties"][PropertyName]]["return"]
  >,
  node: InterfaceInstanceNode<Types, TypeName, Type>,
  context: Context,
) => Promise<ReturnType["properties"][PropertyName]>;

export type InterfaceTransformerDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends InterfaceType<keyof Types> & Types[TypeName],
  ReturnTypes extends TransformerReturnTypes<Types>,
  ReturnType extends InterfaceReturnType<Type>,
  Context,
> = {
  transformer: InterfaceTransformerFunction<
    Types,
    TypeName,
    Type,
    ReturnType,
    Context
  >;
  properties: {
    [PropertyName in keyof Type["properties"]]: InterfaceTransformerPropertyFunction<
      Types,
      TypeName,
      Type,
      ReturnTypes,
      ReturnType,
      PropertyName,
      Context
    >;
  };
};

export type UnionTransformerFunction<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends UnionType<keyof Types> & Types[TypeName],
  ReturnTypes extends TransformerReturnTypes<Types>,
  ReturnType extends UnionReturnType,
  Context,
> = (
  originalData: Type["type"],
  getTransformedChildren: GetTransformedChildrenFunction<
    ReturnTypes[Type["typeNames"]]["return"]
  >,
  setReturnPointer: SetReturnPointerFunction<ReturnType["return"]>,
  node: UnionInstanceNode<Types, TypeName, Type>,
  context: Context,
) => Promise<ReturnType["return"]>;

export type UnionTransformerDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends UnionType<keyof Types> & Types[TypeName],
  ReturnTypes extends TransformerReturnTypes<Types>,
  ReturnType extends UnionReturnType,
  Context,
> = UnionTransformerFunction<
  Types,
  TypeName,
  Type,
  ReturnTypes,
  ReturnType,
  Context
>;

export type PrimitiveTransformerFunction<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends PrimitiveType & Types[TypeName],
  ReturnType extends PrimitiveReturnType,
  Context,
> = (
  originalData: Type["type"],
  node: PrimitiveInstanceNode<Types, TypeName, Type>,
  context: Context,
) => Promise<ReturnType["return"]>;

export type PrimitiveTransformerDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends PrimitiveType & Types[TypeName],
  ReturnType extends PrimitiveReturnType,
  Context,
> = PrimitiveTransformerFunction<Types, TypeName, Type, ReturnType, Context>;

export type TransformerDefinition<
  Types extends TraverserTypes<any>,
  ReturnTypes extends TransformerReturnTypes<Types>,
  TypeName extends keyof Types,
  Context,
> = Types[TypeName] extends InterfaceType<keyof Types>
  ? ReturnTypes[TypeName] extends InterfaceReturnType<Types[TypeName]>
    ? InterfaceTransformerDefinition<
        Types,
        TypeName,
        Types[TypeName],
        ReturnTypes,
        ReturnTypes[TypeName],
        Context
      >
    : never
  : Types[TypeName] extends UnionType<keyof Types>
  ? ReturnTypes[TypeName] extends UnionReturnType
    ? UnionTransformerDefinition<
        Types,
        TypeName,
        Types[TypeName],
        ReturnTypes,
        ReturnTypes[TypeName],
        Context
      >
    : never
  : Types[TypeName] extends PrimitiveType
  ? ReturnTypes[TypeName] extends PrimitiveReturnType
    ? PrimitiveTransformerDefinition<
        Types,
        TypeName,
        Types[TypeName],
        ReturnTypes[TypeName],
        Context
      >
    : never
  : never;

export type Transformers<
  Types extends TraverserTypes<any>,
  ReturnTypes extends TransformerReturnTypes<Types>,
  Context,
> = {
  [TypeName in keyof ReturnTypes]: TransformerDefinition<
    Types,
    ReturnTypes,
    TypeName,
    Context
  >;
};

/**
 * Input
 */
export type InterfaceTransformerInputDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends InterfaceType<keyof Types> & Types[TypeName],
  ReturnTypes extends TransformerReturnTypes<Types>,
  ReturnType extends InterfaceReturnType<Type>,
  Context,
> = {
  transformer: InterfaceTransformerFunction<
    Types,
    TypeName,
    Type,
    ReturnType,
    Context
  >;
  properties?: Partial<{
    [PropertyName in keyof Type["properties"]]: InterfaceTransformerPropertyFunction<
      Types,
      TypeName,
      Type,
      ReturnTypes,
      ReturnType,
      PropertyName,
      Context
    >;
  }>;
};

export type UnionTransformerInputDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends UnionType<keyof Types> & Types[TypeName],
  ReturnTypes extends TransformerReturnTypes<Types>,
  ReturnType extends UnionReturnType,
  Context,
> = UnionTransformerFunction<
  Types,
  TypeName,
  Type,
  ReturnTypes,
  ReturnType,
  Context
>;

export type PrimitiveTransformerInputDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends PrimitiveType & Types[TypeName],
  ReturnType extends PrimitiveReturnType,
  Context,
> = PrimitiveTransformerFunction<Types, TypeName, Type, ReturnType, Context>;

export type TransformerInputDefinition<
  Types extends TraverserTypes<any>,
  ReturnTypes extends TransformerReturnTypes<Types>,
  TypeName extends keyof Types,
  Context,
> = Types[TypeName] extends InterfaceType<keyof Types>
  ? ReturnTypes[TypeName] extends InterfaceReturnType<Types[TypeName]>
    ? InterfaceTransformerInputDefinition<
        Types,
        TypeName,
        Types[TypeName],
        ReturnTypes,
        ReturnTypes[TypeName],
        Context
      >
    : never
  : Types[TypeName] extends UnionType<keyof Types>
  ? ReturnTypes[TypeName] extends UnionReturnType
    ? UnionTransformerInputDefinition<
        Types,
        TypeName,
        Types[TypeName],
        ReturnTypes,
        ReturnTypes[TypeName],
        Context
      >
    : never
  : Types[TypeName] extends PrimitiveType
  ? ReturnTypes[TypeName] extends PrimitiveReturnType
    ? PrimitiveTransformerInputDefinition<
        Types,
        TypeName,
        Types[TypeName],
        ReturnTypes[TypeName],
        Context
      >
    : never
  : never;

export type TransformersInput<
  Types extends TraverserTypes<any>,
  InputReturnTypes extends TransformerInputReturnTypes<Types>,
  Context,
  ReturnTypes extends
    TransformerReturnTypes<Types> = ApplyTransformerReturnTypesDefaults<
    Types,
    InputReturnTypes
  >,
> = Partial<{
  [TypeName in keyof ReturnTypes]: undefined extends InputReturnTypes[TypeName]
    ?
        | TransformerInputDefinition<Types, ReturnTypes, TypeName, Context>
        | undefined
    : TransformerInputDefinition<Types, ReturnTypes, TypeName, Context>;
}>;
