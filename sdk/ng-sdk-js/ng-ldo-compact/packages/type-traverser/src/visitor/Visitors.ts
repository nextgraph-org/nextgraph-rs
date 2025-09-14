/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  InterfaceType,
  PrimitiveType,
  TraverserTypes,
  UnionType,
} from "../index.js";
import type { InterfaceInstanceNode } from "../instanceGraph/nodes/InterfaceInstanceNode.js";
import type { PrimitiveInstanceNode } from "../instanceGraph/nodes/PrimitiveInstanceNode.js";
import type { UnionInstanceNode } from "../instanceGraph/nodes/UnionInstanceNode.js";

export type InterfaceVisitorFunction<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends InterfaceType<keyof Types> & Types[TypeName],
  Context,
> = (
  originalData: Type["type"],
  node: InterfaceInstanceNode<Types, TypeName, Type>,
  context: Context,
) => Promise<void>;

export type InterfaceVisitorPropertyFunction<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends InterfaceType<keyof Types> & Types[TypeName],
  PropertyName extends keyof Type["properties"],
  Context,
> = (
  originalData: Types[Type["properties"][PropertyName]]["type"],
  node: InterfaceInstanceNode<Types, TypeName, Type>,
  context: Context,
) => Promise<void>;

export type InterfaceVisitorDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends InterfaceType<keyof Types> & Types[TypeName],
  Context,
> = {
  visitor: InterfaceVisitorFunction<Types, TypeName, Type, Context>;
  properties: {
    [PropertyName in keyof Type["properties"]]: InterfaceVisitorPropertyFunction<
      Types,
      TypeName,
      Type,
      PropertyName,
      Context
    >;
  };
};

export type UnionVisitorFunction<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends UnionType<keyof Types> & Types[TypeName],
  Context,
> = (
  originalData: Type["type"],
  node: UnionInstanceNode<Types, TypeName, Type>,
  context: Context,
) => Promise<void>;

export type UnionVisitorDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends UnionType<keyof Types> & Types[TypeName],
  Context,
> = UnionVisitorFunction<Types, TypeName, Type, Context>;

export type PrimitiveVisitorFunction<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends PrimitiveType & Types[TypeName],
  Context,
> = (
  originalData: Type["type"],
  node: PrimitiveInstanceNode<Types, TypeName, Type>,
  context: Context,
) => Promise<void>;

export type PrimitiveVisitorDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends PrimitiveType & Types[TypeName],
  Context,
> = PrimitiveVisitorFunction<Types, TypeName, Type, Context>;

export type VisitorDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Context,
> = Types[TypeName] extends InterfaceType<keyof Types>
  ? InterfaceVisitorDefinition<Types, TypeName, Types[TypeName], Context>
  : Types[TypeName] extends UnionType<keyof Types>
  ? UnionVisitorDefinition<Types, TypeName, Types[TypeName], Context>
  : Types[TypeName] extends PrimitiveType
  ? PrimitiveVisitorDefinition<Types, TypeName, Types[TypeName], Context>
  : never;

export type Visitors<Types extends TraverserTypes<any>, Context> = {
  [TypeName in keyof Types]: VisitorDefinition<Types, TypeName, Context>;
};

/**
 * Input
 */
export type InterfaceVisitorInputDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends InterfaceType<keyof Types> & Types[TypeName],
  Context,
> = {
  visitor: InterfaceVisitorFunction<Types, TypeName, Type, Context>;
  properties?: Partial<{
    [PropertyName in keyof Type["properties"]]: InterfaceVisitorPropertyFunction<
      Types,
      TypeName,
      Type,
      PropertyName,
      Context
    >;
  }>;
};

export type UnionVisitorInputDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends UnionType<keyof Types> & Types[TypeName],
  Context,
> = UnionVisitorFunction<Types, TypeName, Type, Context>;

export type PrimitiveVisitorInputDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends PrimitiveType & Types[TypeName],
  Context,
> = PrimitiveVisitorFunction<Types, TypeName, Type, Context>;

export type VisitorInputDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Context,
> = Types[TypeName] extends InterfaceType<keyof Types>
  ? InterfaceVisitorInputDefinition<Types, TypeName, Types[TypeName], Context>
  : Types[TypeName] extends UnionType<keyof Types>
  ? UnionVisitorInputDefinition<Types, TypeName, Types[TypeName], Context>
  : Types[TypeName] extends PrimitiveType
  ? PrimitiveVisitorInputDefinition<Types, TypeName, Types[TypeName], Context>
  : never;

export type VisitorsInput<
  Types extends TraverserTypes<any>,
  Context,
> = Partial<{
  [TypeName in keyof Types]: VisitorInputDefinition<Types, TypeName, Context>;
}>;
