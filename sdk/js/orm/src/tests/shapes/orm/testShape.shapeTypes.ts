import type { ShapeType } from "@ng-org/orm";

import { testShapeSchema } from "./testShape.schema.ts";
import type {
  Root,
  ChildShape1,
  ChildShape2,
  ChildShape3,
  ChildChild,
} from "./testShape.syncedTypings.ts";

// ShapeTypes for testShape.shex

export const RootShapeType: ShapeType<Root> = {
  schema: testShapeSchema,
  shape: "did:ng:z:RootShape",
};

export const ChildShape1ShapeType: ShapeType<ChildShape1> = {
  schema: testShapeSchema,
  shape: "did:ng:z:ChildShape1",
};

export const ChildShape2ShapeType: ShapeType<ChildShape2> = {
  schema: testShapeSchema,
  shape: "did:ng:z:ChildShape2",
};

export const ChildShape3ShapeType: ShapeType<ChildShape3> = {
  schema: testShapeSchema,
  shape: "did:ng:z:ChildShape3",
};

export const ChildChildShapeType: ShapeType<ChildChild> = {
  schema: testShapeSchema,
  shape: "did:ng:z:ChildChildShape",
};
