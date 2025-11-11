import type { ShapeType } from "@ng-org/shex-orm";
import { socialquerySchema } from "./socialquery.schema";
import type { SocialQuery } from "./socialquery.typings";

// ShapeTypes for socialquery
export const SocialQueryShapeType: ShapeType<SocialQuery> = {
  schema: socialquerySchema,
  shape: "did:ng:x:shape#SocialQuery",
};
