import type { ShapeType } from "@ng-org/shex-orm";
import { rcardSchema } from "./rcard.schema";
import type {
  RCardPermissionTriple,
  RCardPermission,
  RCard,
} from "./rcard.typings";

// ShapeTypes for rcard
export const RCardPermissionTripleShapeType: ShapeType<RCardPermissionTriple> =
  {
    schema: rcardSchema,
    shape: "did:ng:x:social:rcard:permission#RCardPermissionTriple",
  };
export const RCardPermissionShapeType: ShapeType<RCardPermission> = {
  schema: rcardSchema,
  shape: "did:ng:x:social:rcard:permission#RCardPermission",
};
export const RCardShapeType: ShapeType<RCard> = {
  schema: rcardSchema,
  shape: "did:ng:x:social:rcard#RCard",
};
