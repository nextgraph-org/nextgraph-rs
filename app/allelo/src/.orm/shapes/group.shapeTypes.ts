import type { ShapeType } from "@ng-org/shex-orm";
import { groupSchema } from "./group.schema";
import type { SocialGroup, SocialPost } from "./group.typings";

// ShapeTypes for group
export const SocialGroupShapeType: ShapeType<SocialGroup> = {
  schema: groupSchema,
  shape: "did:ng:x:social:group#SocialGroup",
};
export const SocialPostShapeType: ShapeType<SocialPost> = {
  schema: groupSchema,
  shape: "did:ng:x:social:post#SocialPost",
};
