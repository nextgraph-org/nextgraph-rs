import { ShapeType } from "@ldo/ldo";
import { containerSchema } from "./container.schema";
import { containerContext } from "./container.context";
import { Container } from "./container.typings";

/**
 * =============================================================================
 * LDO ShapeTypes container
 * =============================================================================
 */

/**
 * Container ShapeType
 */
export const ContainerShapeType: ShapeType<Container> = {
  schema: containerSchema,
  shape: "http://www.w3.org/ns/lddps#Container",
  context: containerContext,
};
