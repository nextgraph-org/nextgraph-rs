import { ResourceSuccess } from "@ldo/connected";
import type { WacRule } from "../WacRule.js";
import type { SolidContainer } from "../../resources/SolidContainer.js";
import type { SolidLeaf } from "../../resources/SolidLeaf.js";

/**
 * Returned when rules were successfully written
 */
export class SetWacRuleSuccess<
  ResourceType extends SolidLeaf | SolidContainer,
> extends ResourceSuccess<ResourceType> {
  type = "setWacRuleSuccess" as const;
  /**
   * The written rule
   */
  wacRule: WacRule;

  constructor(resource: ResourceType, wacRule: WacRule) {
    super(resource);
    this.wacRule = wacRule;
  }
}
