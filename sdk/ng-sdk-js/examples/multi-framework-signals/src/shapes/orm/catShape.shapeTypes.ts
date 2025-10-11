import type { ShapeType } from "@nextgraph-monorepo/ng-shex-orm";
import { catShapeSchema } from "./catShape.schema";
import type { Cat } from "./catShape.typings";

// ShapeTypes for catShape
export const CatShapeType: ShapeType<Cat> = {
  schema: catShapeSchema,
  shape: "http://example.org/Cat",
};
