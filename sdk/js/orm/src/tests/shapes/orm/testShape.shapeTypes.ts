import type { ShapeType } from "@ng-org/shex-orm";
import { testShapeSchema } from "./testShape.schema.ts";
import type {
  Root,
  ChildShape1,
  ChildShape2,
  ChildShape3,
  ChildChild,
} from "./testShape.typings.ts";

// ShapeTypes for testShape
export const RootShapeType = {
  schema: testShapeSchema,
  shape: "did:ng:z:RootShape",
} as const satisfies ShapeType<Root>;

export const ChildShape1ShapeType = {
  schema: testShapeSchema,
  shape: "did:ng:z:ChildShape1",
} as const satisfies ShapeType<ChildShape1>;

export const ChildShape2ShapeType = {
  schema: testShapeSchema,
  shape: "did:ng:z:ChildShape2",
} as const satisfies ShapeType<ChildShape2>;

export const ChildShape3ShapeType = {
  schema: testShapeSchema,
  shape: "did:ng:z:ChildShape3",
} as const satisfies ShapeType<ChildShape3>;

export const ChildChildShapeType = {
  schema: testShapeSchema,
  shape: "did:ng:z:ChildChildShape",
} as const satisfies ShapeType<ChildChild>;
