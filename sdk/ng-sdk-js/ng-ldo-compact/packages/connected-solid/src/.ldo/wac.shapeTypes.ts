import { ShapeType } from "@ldo/ldo";
import { wacSchema } from "./wac.schema.js";
import { wacContext } from "./wac.context.js";
import { Authorization } from "./wac.typings.js";

/**
 * =============================================================================
 * LDO ShapeTypes wac
 * =============================================================================
 */

/**
 * Authorization ShapeType
 */
export const AuthorizationShapeType: ShapeType<Authorization> = {
  schema: wacSchema,
  shape: "http://www.w3.org/ns/auth/acls#Authorization",
  context: wacContext,
};
