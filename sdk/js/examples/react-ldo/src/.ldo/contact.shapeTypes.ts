import { ShapeType } from "@ldo/ldo";
import { contactSchema } from "./contact.schema";
import { contactContext } from "./contact.context";
import { SocialContact } from "./contact.typings";

/**
 * =============================================================================
 * LDO ShapeTypes contact
 * =============================================================================
 */

/**
 * SocialContact ShapeType
 */
export const SocialContactShapeType: ShapeType<SocialContact> = {
  schema: contactSchema,
  shape: "did:ng:n:g:x:social:contact#SocialContact",
  context: contactContext,
};
