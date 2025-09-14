import type { CompactShapeType } from "@ldo/ldo";
import { catShapeSchema } from "./catShape.schema";
import type { Cat } from "./catShape.typings";

// Compact ShapeTypes for catShape
export const CatShapeType: CompactShapeType<Cat> = {
  schema: catShapeSchema,
  shape: "http://example.org/Cat",
};
