import type { CompactShapeType } from "@ldo/ldo";
import { personShapeSchema } from "./personShape.schema";
import type { Person } from "./personShape.typings";

// Compact ShapeTypes for personShape
export const PersonShapeType: CompactShapeType<Person> = {
  schema: personShapeSchema,
  shape: "http://example.org/Person",
};
