import { ShapeType } from "@ldo/ldo";
import { postSchema } from "./post.schema.js";
import { postContext } from "./post.context.js";
import { PostSh } from "./post.typings.js";

/**
 * =============================================================================
 * LDO ShapeTypes post
 * =============================================================================
 */

/**
 * PostSh ShapeType
 */
export const PostShShapeType: ShapeType<PostSh> = {
  schema: postSchema,
  shape: "https://example.com/PostSh",
  context: postContext,
};
