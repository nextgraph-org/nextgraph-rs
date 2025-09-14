import { createLdoDataset } from "@ldo/ldo";
import type { AccessModeList, WacRule } from "./WacRule.js";
import { SetWacRuleSuccess } from "./results/SetWacRuleSuccess.js";
import type { Authorization } from "../.ldo/wac.typings.js";
import { AuthorizationShapeType } from "../.ldo/wac.shapeTypes.js";
import { v4 } from "uuid";
import { guaranteeFetch } from "../util/guaranteeFetch.js";
import type { SolidLeafUri } from "../types.js";
import type { SolidLeaf } from "../resources/SolidLeaf.js";
import type { SolidContainer } from "../resources/SolidContainer.js";
import {
  HttpErrorResult,
  type HttpErrorResultType,
} from "../requester/results/error/HttpErrorResult.js";
import type { UnexpectedResourceError } from "@ldo/connected";
import type { BasicRequestOptions } from "../requester/requests/requestOptions.js";
import { isSolidContainerUri } from "../util/isSolidUri.js";

export type SetWacRuleError<ResourceType extends SolidContainer | SolidLeaf> =
  | HttpErrorResultType<ResourceType>
  | UnexpectedResourceError<ResourceType>;
export type SetWacRuleResult<ResourceType extends SolidContainer | SolidLeaf> =
  | SetWacRuleSuccess<ResourceType>
  | SetWacRuleError<ResourceType>;

/**
 * Given the URI of an ACL document and some WAC rules, set the WAC rules of
 * that document
 * @param aclUri: The URI for the ACL document
 * @param newRule: A new WAC rule to set. This will overwrite old rules
 * @param accessTo: The document this rule refers to
 * @param options: Options object to include an authenticated fetch function
 * @returns SetWacRuleResult
 */
export async function setWacRuleForAclUri(
  aclUri: SolidLeafUri,
  newRule: WacRule,
  resource: SolidContainer,
  options?: BasicRequestOptions,
): Promise<SetWacRuleResult<SolidContainer>>;
export async function setWacRuleForAclUri(
  aclUri: SolidLeafUri,
  newRule: WacRule,
  resource: SolidLeaf,
  options?: BasicRequestOptions,
): Promise<SetWacRuleResult<SolidLeaf>>;
export async function setWacRuleForAclUri(
  aclUri: SolidLeafUri,
  newRule: WacRule,
  resource: SolidContainer | SolidLeaf,
  options?: BasicRequestOptions,
): Promise<SetWacRuleResult<SolidContainer | SolidLeaf>>;
export async function setWacRuleForAclUri(
  aclUri: SolidLeafUri,
  newRule: WacRule,
  resource: SolidContainer | SolidLeaf,
  options?: BasicRequestOptions,
): Promise<SetWacRuleResult<SolidContainer | SolidLeaf>> {
  const fetch = guaranteeFetch(options?.fetch);
  // The rule map keeps track of all the rules that are currently being used
  // so that similar rules can be grouped together
  const ruleMap: Record<string, Authorization> = {};
  // The dataset that will eventually be sent to the Pod
  const dataset = createLdoDataset();

  // Helper function to add rules to the dataset by grouping them in the ruleMap
  function addRuleToDataset(
    type: "public" | "authenticated" | "agent",
    accessModeList: AccessModeList,
    agentId?: string,
  ) {
    const accessModeListHash = hashAccessModeList(accessModeList);
    // No need to add if all access is false
    if (accessModeListHash === "") return;
    if (!ruleMap[accessModeListHash]) {
      const authorization = dataset
        .usingType(AuthorizationShapeType)
        .fromSubject(`${aclUri}#${v4()}`);
      authorization.type = { "@id": "Authorization" };
      if (accessModeList.read) authorization.mode?.add({ "@id": "Read" });
      if (accessModeList.write) authorization.mode?.add({ "@id": "Write" });
      if (accessModeList.append) authorization.mode?.add({ "@id": "Append" });
      if (accessModeList.control) authorization.mode?.add({ "@id": "Control" });
      authorization.accessTo = { "@id": resource.uri };
      if (isSolidContainerUri(resource.uri)) {
        authorization.default = { "@id": resource.uri };
      }
      ruleMap[accessModeListHash] = authorization;
    }
    const authorization = ruleMap[accessModeListHash];
    // Add agents to the rule
    if (type === "public") {
      authorization.agentClass?.add({ "@id": "Agent" });
    } else if (type === "authenticated") {
      authorization.agentClass?.add({ "@id": "AuthenticatedAgent" });
    } else if (type === "agent" && agentId) {
      authorization.agent?.add({ "@id": agentId });
    }
  }

  // Add each rule to the dataset
  addRuleToDataset("public", newRule.public);
  addRuleToDataset("authenticated", newRule.authenticated);
  Object.entries(newRule.agent).forEach(([agentUri, accessModeList]) => {
    addRuleToDataset("agent", accessModeList, agentUri);
  });

  // Save to Pod
  const response = await fetch(aclUri, {
    method: "PUT",
    headers: {
      "content-type": "text/turtle",
    },
    body: dataset.toString(),
  });
  const errorResult = HttpErrorResult.checkResponse(resource, response);
  if (errorResult) return errorResult;

  return new SetWacRuleSuccess(resource, newRule);
}

// Hashes the access mode list for use in the rule map
function hashAccessModeList(list: AccessModeList): string {
  return Object.entries(list).reduce(
    (agg, [key, isPresent]) => (isPresent ? agg + key : agg),
    "",
  );
}
