import { ShapeType } from "@ldo/ldo";
import { profileSchema } from "./profile.schema.js";
import { profileContext } from "./profile.context.js";
import { TypeIndexProfile } from "./profile.typings.js";

/**
 * =============================================================================
 * LDO ShapeTypes profile
 * =============================================================================
 */

/**
 * TypeIndexProfile ShapeType
 */
export const TypeIndexProfileShapeType: ShapeType<TypeIndexProfile> = {
  schema: profileSchema,
  shape: "https://shaperepo.com/schemas/solidProfile#TypeIndexProfile",
  context: profileContext,
};
