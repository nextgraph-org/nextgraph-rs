import { ShapeType } from "@ldo/ldo";
import { typeIndexSchema } from "./typeIndex.schema.js";
import { typeIndexContext } from "./typeIndex.context.js";
import { TypeIndexDocument, TypeRegistration } from "./typeIndex.typings.js";

/**
 * =============================================================================
 * LDO ShapeTypes typeIndex
 * =============================================================================
 */

/**
 * TypeIndexDocument ShapeType
 */
export const TypeIndexDocumentShapeType: ShapeType<TypeIndexDocument> = {
  schema: typeIndexSchema,
  shape: "https://shaperepo.com/schemas/solidProfile#TypeIndexDocument",
  context: typeIndexContext,
};

/**
 * TypeRegistration ShapeType
 */
export const TypeRegistrationShapeType: ShapeType<TypeRegistration> = {
  schema: typeIndexSchema,
  shape: "https://shaperepo.com/schemas/solidProfile#TypeRegistration",
  context: typeIndexContext,
};
