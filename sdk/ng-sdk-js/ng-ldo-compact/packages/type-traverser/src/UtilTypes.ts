export type KeyTypes = string | number | symbol;

export type AssertExtends<
  Extended,
  Extends extends Extended,
> = Extends extends Extended ? Extends : never;
