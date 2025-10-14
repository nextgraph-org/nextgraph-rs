import type { ShapeType } from "@ng-org/shex-orm";
import { testShapeSchema } from "./testShape.schema";
import type { TestObject } from "./testShape.typings";

// ShapeTypes for testShape
export const TestObjectShapeType: ShapeType<TestObject> = {
  schema: testShapeSchema,
  shape: "http://example.org/TestObject",
};
