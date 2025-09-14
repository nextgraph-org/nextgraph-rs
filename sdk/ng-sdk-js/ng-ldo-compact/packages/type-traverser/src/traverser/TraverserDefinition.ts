/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  InterfaceType,
  TraverserTypes,
  UnionType,
  PrimitiveType,
} from "../index.js";

export type InterfaceTraverserDefinition<Type extends InterfaceType<any>> = {
  kind: "interface";
  properties: {
    [PropertyField in keyof Type["properties"]]: Type["properties"][PropertyField];
  };
};

export type UnionTraverserDefinition<Type extends UnionType<any>> = {
  kind: "union";
  selector: (item: Type["type"]) => Type["typeNames"];
};

export type PrimitiveTraverserDefinition = {
  kind: "primitive";
};

export type TraverserDefinition<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends Types[TypeName],
> = {
  [TN in TypeName]: Type extends InterfaceType<keyof Types>
    ? InterfaceTraverserDefinition<Type>
    : Type extends UnionType<keyof Types>
    ? UnionTraverserDefinition<Type>
    : Type extends PrimitiveType
    ? PrimitiveTraverserDefinition
    : never;
}[TypeName];

export type TraverserDefinitions<Types extends TraverserTypes<any>> = {
  [TypeName in keyof Types]: TraverserDefinition<
    Types,
    TypeName,
    Types[TypeName]
  >;
};
