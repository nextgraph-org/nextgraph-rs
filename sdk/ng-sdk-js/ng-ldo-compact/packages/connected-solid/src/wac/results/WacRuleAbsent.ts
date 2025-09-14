import { ResourceSuccess } from "@ldo/connected";
import type { SolidLeaf } from "../../resources/SolidLeaf.js";
import type { SolidContainer } from "../../resources/SolidContainer.js";

/**
 * Returned if no WAC rule was returned from the server
 */
export class WacRuleAbsent<
  ResourceType extends SolidLeaf | SolidContainer,
> extends ResourceSuccess<ResourceType> {
  type = "wacRuleAbsent" as const;
}
