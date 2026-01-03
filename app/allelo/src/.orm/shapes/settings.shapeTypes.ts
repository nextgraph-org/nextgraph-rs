import type { ShapeType } from "@ng-org/shex-orm";
import { settingsSchema } from "./settings.schema";
import type { AppSettings } from "./settings.typings";

// ShapeTypes for settings
export const AppSettingsShapeType: ShapeType<AppSettings> = {
  schema: settingsSchema,
  shape: "did:ng:x:settings#AppSettings",
};
