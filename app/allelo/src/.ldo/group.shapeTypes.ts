import { ShapeType } from "@ldo/ldo";
import { groupSchema } from "./group.schema";
import { groupContext } from "./group.context";
import { SocialGroup, SocialPost, GroupMembership } from "./group.typings";

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

/**
 * GroupMembership ShapeType
 */
export const GroupMembershipShapeType: ShapeType<GroupMembership> = {
  schema: groupSchema,
  shape: "did:ng:x:contact:class#GroupMembership",
  context: groupContext,
};
