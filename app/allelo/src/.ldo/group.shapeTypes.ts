import { ShapeType } from "@ldo/ldo";
import { groupSchema } from "./group.schema";
import { groupContext } from "./group.context";
import { SocialGroup, SocialPost } from "./group.typings";

/**
 * =============================================================================
 * LDO ShapeTypes group
 * =============================================================================
 */

/**
 * SocialGroup ShapeType
 */
export const SocialGroupShapeType: ShapeType<SocialGroup> = {
  schema: groupSchema,
  shape: "did:ng:x:social:group#SocialGroup",
  context: groupContext,
};

/**
 * SocialPost ShapeType
 */
export const SocialPostShapeType: ShapeType<SocialPost> = {
  schema: groupSchema,
  shape: "did:ng:x:social:post#SocialPost",
  context: groupContext,
};
