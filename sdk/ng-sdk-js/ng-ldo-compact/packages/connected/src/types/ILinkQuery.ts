// This file is a stripped down version of a full-implmentation of a global
// query interface found here https://github.com/o-development/ldo-query/blob/main/lib/ShapeQuery.ts
// If I ever want to implement a global query interface, this is a good place
// to start.

import type { LdoBase, LdSet } from "@ldo/ldo";
// import { SolidProfileShapeShapeType } from "../../test/.ldo/solidProfile.shapeTypes.js";
// import type { SolidProfileShape } from "../../test/.ldo/solidProfile.typings.js";

/**
 * Link Query Input
 */
export type LQInput<Type> = LQInputObject<Type>;

export type LQInputObject<Type> = Partial<{
  [key in Exclude<keyof Type, "@context">]: LQInputFlattenSet<Type[key]>;
}>;

export type LQInputSubSet<Type> = Type extends object
  ? LQInputObject<Type>
  : true;

export type LQInputFlattenSet<Type> = Type extends LdSet<infer SetSubType>
  ? LQInputSubSet<SetSubType>
  : LQInputSubSet<Type>;

/**
 * Link Query Return
 */
export type LQReturn<Type, Input extends LQInput<Type>> = LQReturnObject<
  Type,
  Input
>;

export type LQReturnObject<Type, Input extends LQInputObject<Type>> = {
  [key in Exclude<
    keyof Required<Type>,
    "@context"
  > as undefined extends Input[key]
    ? never
    : key]: Input[key] extends LQInputFlattenSet<Type[key]>
    ? undefined extends Type[key]
      ? LQReturnExpandSet<Type[key], Input[key]> | undefined
      : LQReturnExpandSet<Type[key], Input[key]>
    : never;
};

export type LQReturnSubSet<Type, Input> = Input extends LQInputSubSet<Type>
  ? Input extends LQInputObject<Type>
    ? Input extends true
      ? Type
      : LQReturnObject<Type, Input>
    : Type
  : never;

export type LQReturnExpandSet<
  Type,
  Input extends LQInputFlattenSet<Type>,
> = NonNullable<Type> extends LdSet<infer SetSubType>
  ? LdSet<LQReturnSubSet<SetSubType, Input>>
  : LQReturnSubSet<Type, Input>;

/**
 * Helper Functions
 */
export type ExpandDeep<T> = T extends LdSet<infer U>
  ? LdSet<ExpandDeep<U>> // recursively expand sets
  : T extends object
  ? { [K in keyof T]: ExpandDeep<T[K]> } // recursively expand objects
  : T; // base case (primitive types)

/**
 * ILinkQuery: Manages resources in a link query
 */
export interface LinkQueryRunOptions {
  reload?: boolean;
}

export interface ILinkQuery<Type extends LdoBase, Input extends LQInput<Type>> {
  run(
    options?: LinkQueryRunOptions,
  ): Promise<ExpandDeep<LQReturn<Type, Input>>>;
  subscribe(): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  unsubscribeAll(): Promise<void>;
  fromSubject(): ExpandDeep<LQReturn<Type, Input>>;
}
