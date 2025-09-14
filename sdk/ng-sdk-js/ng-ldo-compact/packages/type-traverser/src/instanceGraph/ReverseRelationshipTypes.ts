/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  InterfaceType,
  PrimitiveType,
  TraverserTypes,
  UnionType,
} from "../traverser/TraverserTypes.js";

export type InterfaceReverseRelationshipIndentifier<
  Types extends TraverserTypes<any>,
  ChildName extends keyof Types,
  PotentialParentName extends keyof Types,
  PotentialParentType extends InterfaceType<keyof Types>,
> = {
  [PropertyField in keyof PotentialParentType["properties"]]: ChildName extends PotentialParentType["properties"][PropertyField]
    ? [PotentialParentName, PropertyField]
    : never;
}[keyof PotentialParentType["properties"]];

export type UnionReverseRelationshipIndentifier<
  Types extends TraverserTypes<any>,
  ChildName extends keyof Types,
  PotentialParentName extends keyof Types,
  PotentialParentType extends UnionType<keyof Types>,
> = ChildName extends PotentialParentType["typeNames"]
  ? [PotentialParentName]
  : never;

export type PrimitiveReverseRelationshipIndentifier<
  Types extends TraverserTypes<any>,
  _ChildName extends keyof Types,
  _PotentialParentName extends keyof Types,
  _PotentialParentType extends PrimitiveType,
> = never;

export type BaseReverseRelationshipIndentifier<
  Types extends TraverserTypes<any>,
  ChildName extends keyof Types,
  PotentialParentName extends keyof Types,
> = Types[PotentialParentName] extends InterfaceType<keyof Types>
  ? InterfaceReverseRelationshipIndentifier<
      Types,
      ChildName,
      PotentialParentName,
      Types[PotentialParentName]
    >
  : Types[PotentialParentName] extends UnionType<keyof Types>
  ? UnionReverseRelationshipIndentifier<
      Types,
      ChildName,
      PotentialParentName,
      Types[PotentialParentName]
    >
  : Types[PotentialParentName] extends PrimitiveType
  ? PrimitiveReverseRelationshipIndentifier<
      Types,
      ChildName,
      PotentialParentName,
      Types[PotentialParentName]
    >
  : never;

export type BaseReverseRelationshipIndentifiers<
  Types extends TraverserTypes<any>,
  ChildName extends keyof Types,
> = {
  [ParentName in keyof Types]: BaseReverseRelationshipIndentifier<
    Types,
    ChildName,
    ParentName
  >;
};

export type ParentIdentifiers<
  Types extends TraverserTypes<any>,
  ChildName extends keyof Types,
> = {
  [CN in ChildName]: BaseReverseRelationshipIndentifiers<
    Types,
    CN
  >[keyof Types];
}[ChildName];
