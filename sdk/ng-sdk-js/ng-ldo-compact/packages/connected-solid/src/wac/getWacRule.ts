import { GetWacRuleSuccess } from "./results/GetWacRuleSuccess.js";
import { AuthorizationShapeType } from "../.ldo/wac.shapeTypes.js";
import type { AccessModeList, WacRule } from "./WacRule.js";
import type { Authorization } from "../.ldo/wac.typings.js";
import { WacRuleAbsent } from "./results/WacRuleAbsent.js";
import {
  HttpErrorResult,
  type HttpErrorResultType,
} from "../requester/results/error/HttpErrorResult.js";
import { NoncompliantPodError } from "../requester/results/error/NoncompliantPodError.js";
import type { UnexpectedResourceError } from "@ldo/connected";
import type { SolidLeaf } from "../resources/SolidLeaf.js";
import type { SolidContainer } from "../resources/SolidContainer.js";
import { guaranteeFetch } from "../util/guaranteeFetch.js";
import type { BasicRequestOptions } from "../requester/requests/requestOptions.js";
import { rawTurtleToDataset } from "../util/rdfUtils.js";

export type GetWacRuleError<ResourceType extends SolidContainer | SolidLeaf> =
  | HttpErrorResultType<ResourceType>
  | NoncompliantPodError<ResourceType>
  | UnexpectedResourceError<ResourceType>;

export type GetWacRuleResult<ResourceType extends SolidContainer | SolidLeaf> =
  | GetWacRuleSuccess<ResourceType>
  | GetWacRuleError<ResourceType>
  | WacRuleAbsent<ResourceType>;

/**
 * Given the URI of an ACL document, return the Web Access Control (WAC) rules
 * @param aclUri: The URI for the ACL document
 * @param options: Options object to include an authenticated fetch function
 * @returns GetWacRuleResult
 */
export async function getWacRuleWithAclUri(
  aclUri: string,
  resource: SolidContainer,
  options?: BasicRequestOptions,
): Promise<GetWacRuleResult<SolidContainer>>;
export async function getWacRuleWithAclUri(
  aclUri: string,
  resource: SolidLeaf,
  options?: BasicRequestOptions,
): Promise<GetWacRuleResult<SolidLeaf>>;
export async function getWacRuleWithAclUri(
  aclUri: string,
  resource: SolidLeaf | SolidContainer,
  options?: BasicRequestOptions,
): Promise<GetWacRuleResult<SolidLeaf | SolidContainer>>;
export async function getWacRuleWithAclUri(
  aclUri: string,
  resource: SolidLeaf | SolidContainer,
  options?: BasicRequestOptions,
): Promise<GetWacRuleResult<SolidLeaf | SolidContainer>> {
  const fetch = guaranteeFetch(options?.fetch);
  const response = await fetch(aclUri);
  const errorResult = HttpErrorResult.checkResponse(resource, response);
  if (errorResult) return errorResult;

  if (response.status === 404) {
    return new WacRuleAbsent(resource);
  }

  // Parse Turtle
  const rawTurtle = await response.text();
  const rawTurtleResult = await rawTurtleToDataset(rawTurtle, aclUri);
  if (rawTurtleResult instanceof Error)
    return new NoncompliantPodError(resource, rawTurtleResult.message);
  const dataset = rawTurtleResult;
  const authorizations = dataset
    .usingType(AuthorizationShapeType)
    .matchSubject(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      "http://www.w3.org/ns/auth/acl#Authorization",
    );

  const wacRule: WacRule = {
    public: {
      read: false,
      write: false,
      append: false,
      control: false,
    },
    authenticated: {
      read: false,
      write: false,
      append: false,
      control: false,
    },
    agent: {},
  };

  function applyAccessModesToList(
    accessModeList: AccessModeList,
    authorization: Authorization,
  ): void {
    authorization.mode?.forEach((mode) => {
      accessModeList[mode["@id"].toLowerCase()] = true;
    });
  }

  authorizations.forEach((authorization) => {
    if (
      authorization.agentClass?.some(
        (agentClass) => agentClass["@id"] === "Agent",
      )
    ) {
      applyAccessModesToList(wacRule.public, authorization);
      applyAccessModesToList(wacRule.authenticated, authorization);
    }
    if (
      authorization.agentClass?.some(
        (agentClass) => agentClass["@id"] === "AuthenticatedAgent",
      )
    ) {
      applyAccessModesToList(wacRule.authenticated, authorization);
    }
    authorization.agent?.forEach((agent) => {
      if (!wacRule.agent[agent["@id"]]) {
        wacRule.agent[agent["@id"]] = {
          read: false,
          write: false,
          append: false,
          control: false,
        };
      }
      applyAccessModesToList(wacRule.agent[agent["@id"]], authorization);
    });
  });

  return new GetWacRuleSuccess(resource, wacRule);
}
