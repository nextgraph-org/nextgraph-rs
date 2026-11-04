import type { Unsynced } from "@ng-org/shex-orm";
import type * as Synced from "./testShape.syncedTypings.ts";

/**
 * =============================================================================
 * Unsynced Typescript Typings for testShape
 * =============================================================================
 */

/** Root Type, for creating objects that are not yet attached to the ORM. */
export type Root = Unsynced<Synced.Root>;

/** ChildShape1 Type, for creating objects that are not yet attached to the ORM. */
export type ChildShape1 = Unsynced<Synced.ChildShape1>;

/** ChildShape2 Type, for creating objects that are not yet attached to the ORM. */
export type ChildShape2 = Unsynced<Synced.ChildShape2>;

/** ChildShape3 Type, for creating objects that are not yet attached to the ORM. */
export type ChildShape3 = Unsynced<Synced.ChildShape3>;

/** ChildChild Type, for creating objects that are not yet attached to the ORM. */
export type ChildChild = Unsynced<Synced.ChildChild>;
