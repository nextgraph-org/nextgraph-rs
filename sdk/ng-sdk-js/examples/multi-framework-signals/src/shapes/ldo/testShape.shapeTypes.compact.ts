import type { CompactShapeType } from "@ldo/ldo";
import { testShapeSchema } from "./testShape.schema";
import type { TestObject } from "./testShape.typings";

// Compact ShapeTypes for testShape
export const TestObjectShapeType: CompactShapeType<TestObject> = {
  schema: testShapeSchema,
  shape: "http://example.org/TestObject",
};
