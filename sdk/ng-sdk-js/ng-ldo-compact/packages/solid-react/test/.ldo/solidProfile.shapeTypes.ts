import { ShapeType } from "@ldo/ldo";
import { solidProfileSchema } from "./solidProfile.schema.js";
import { solidProfileContext } from "./solidProfile.context.js";
import { AddressShape, EmailShape, PhoneNumberShape, RSAPublicKeyShape, SolidProfileShape, TrustedAppShape } from "./solidProfile.typings.js";

/**
 * =============================================================================
 * LDO ShapeTypes solidProfile
 * =============================================================================
 */

/**
 * SolidProfileShape ShapeType
 */
export const SolidProfileShapeShapeType: ShapeType<SolidProfileShape> = {
  schema: solidProfileSchema,
  shape: "https://shaperepo.com/schemas/solidProfile#SolidProfileShape",
  context: solidProfileContext,
};

/**
 * AddressShape ShapeType
 */
export const AddressShapeShapeType: ShapeType<AddressShape> = {
  schema: solidProfileSchema,
  shape: "https://shaperepo.com/schemas/solidProfile#AddressShape",
  context: solidProfileContext,
};

/**
 * EmailShape ShapeType
 */
export const EmailShapeShapeType: ShapeType<EmailShape> = {
  schema: solidProfileSchema,
  shape: "https://shaperepo.com/schemas/solidProfile#EmailShape",
  context: solidProfileContext,
};

/**
 * PhoneNumberShape ShapeType
 */
export const PhoneNumberShapeShapeType: ShapeType<PhoneNumberShape> = {
  schema: solidProfileSchema,
  shape: "https://shaperepo.com/schemas/solidProfile#PhoneNumberShape",
  context: solidProfileContext,
};

/**
 * TrustedAppShape ShapeType
 */
export const TrustedAppShapeShapeType: ShapeType<TrustedAppShape> = {
  schema: solidProfileSchema,
  shape: "https://shaperepo.com/schemas/solidProfile#TrustedAppShape",
  context: solidProfileContext,
};

/**
 * RSAPublicKeyShape ShapeType
 */
export const RSAPublicKeyShapeShapeType: ShapeType<RSAPublicKeyShape> = {
  schema: solidProfileSchema,
  shape: "https://shaperepo.com/schemas/solidProfile#RSAPublicKeyShape",
  context: solidProfileContext,
};
