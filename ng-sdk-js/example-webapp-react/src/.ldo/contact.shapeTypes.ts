import { ShapeType } from "@ldo/ldo";
import { contactSchema } from "./contact.schema";
import { contactContext } from "./contact.context";
import { NGSocialContact } from "./contact.typings";

/**
 * =============================================================================
 * LDO ShapeTypes contact
 * =============================================================================
 */

/**
 * NGSocialContact ShapeType
 */
export const NGSocialContactShapeType: ShapeType<NGSocialContact> = {
  schema: contactSchema,
  shape: "did:ng:n:g:x:social:contact#NGSocialContact",
  context: contactContext,
};
