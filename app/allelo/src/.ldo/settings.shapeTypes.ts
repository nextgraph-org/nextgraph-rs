import { ShapeType } from "@ldo/ldo";
import { settingsSchema } from "./settings.schema";
import { settingsContext } from "./settings.context";
import { AppSettings } from "./settings.typings";

/**
 * =============================================================================
 * LDO ShapeTypes settings
 * =============================================================================
 */

/**
 * AppSettings ShapeType
 */
export const AppSettingsShapeType: ShapeType<AppSettings> = {
  schema: settingsSchema,
  shape: "did:ng:x:settings#AppSettings",
  context: settingsContext,
};
