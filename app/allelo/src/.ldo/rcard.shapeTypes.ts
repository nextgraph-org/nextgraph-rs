import { ShapeType } from "@ldo/ldo";
import { rcardSchema } from "./rcard.schema";
import { rcardContext } from "./rcard.context";
import { RCardPermissionTriple, RCardPermission, RCard } from "./rcard.typings";

/**
 * =============================================================================
 * LDO ShapeTypes rcard
 * =============================================================================
 */

/**
 * RCardPermissionTriple ShapeType
 */
export const RCardPermissionTripleShapeType: ShapeType<RCardPermissionTriple> =
  {
    schema: rcardSchema,
    shape: "did:ng:x:social:rcard:permission#RCardPermissionTriple",
    context: rcardContext,
  };

/**
 * RCardPermission ShapeType
 */
export const RCardPermissionShapeType: ShapeType<RCardPermission> = {
  schema: rcardSchema,
  shape: "did:ng:x:social:rcard:permission#RCardPermission",
  context: rcardContext,
};

/**
 * RCard ShapeType
 */
export const RCardShapeType: ShapeType<RCard> = {
  schema: rcardSchema,
  shape: "did:ng:x:social:rcard#RCard",
  context: rcardContext,
};
