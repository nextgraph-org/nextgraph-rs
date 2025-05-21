import { ShapeType } from "@ldo/ldo";
import { contactSchema } from "./contact.schema";
import { contactContext } from "./contact.context";
import { SocialContact, HasRating } from "./contact.typings";

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
  shape: "did:ng:x:class#SocialContact",
  context: contactContext,
};

/**
 * HasRating ShapeType
 */
export const HasRatingShapeType: ShapeType<HasRating> = {
  schema: contactSchema,
  shape: "did:ng:x:class#HasRating",
  context: contactContext,
};
