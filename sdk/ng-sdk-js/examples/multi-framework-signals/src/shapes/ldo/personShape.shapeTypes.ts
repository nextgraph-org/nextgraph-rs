import type { ShapeType } from "@nextgraph-monorepo/ng-shex-orm";
import { personShapeSchema } from "./personShape.schema";
import type { Person } from "./personShape.typings";

// ShapeTypes for personShape
export const PersonShapeType: ShapeType<Person> = {
  schema: personShapeSchema,
  shape: "http://example.org/Person",
};
