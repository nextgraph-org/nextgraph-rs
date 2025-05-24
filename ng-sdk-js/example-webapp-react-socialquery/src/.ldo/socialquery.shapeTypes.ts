import { ShapeType } from "@ldo/ldo";
import { socialquerySchema } from "./socialquery.schema";
import { socialqueryContext } from "./socialquery.context";
import { SocialQuery } from "./socialquery.typings";

/**
 * =============================================================================
 * LDO ShapeTypes socialquery
 * =============================================================================
 */

/**
 * SocialQuery ShapeType
 */
export const SocialQueryShapeType: ShapeType<SocialQuery> = {
  schema: socialquerySchema,
  shape: "did:ng:x:shape#SocialQuery",
  context: socialqueryContext,
};
