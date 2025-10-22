import type { ShapeType } from "@ng-org/shex-orm";
import { basicSchema } from "./basic.schema";
import type { Basic } from "./basic.typings";

// ShapeTypes for basic
export const BasicShapeType: ShapeType<Basic> = {
  schema: basicSchema,
  shape: "http://example.org/Basic",
};
