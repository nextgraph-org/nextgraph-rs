import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for wac
 * =============================================================================
 */

/**
 * Authorization Type
 */
export interface Authorization {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Denotes this as an acl:Authorization
   */
  type: {
    "@id": "Authorization";
  };
  /**
   * The subject of this authorization
   */
  accessTo?: {
    "@id": string;
  };
  /**
   * The container subject of this authorization
   */
  default?: {
    "@id": string;
  };
  /**
   * An agent is a person, social entity or software identified by a URI, e.g., a WebID denotes an agent
   */
  agent?: LdSet<{
    "@id": string;
  }>;
  /**
   * Denotes a group of agents being given the access permission
   */
  agentGroup?: LdSet<{
    "@id": string;
  }>;
  /**
   * An agent class is a class of persons or entities identified by a URI.
   */
  agentClass?: LdSet<
    | {
        "@id": "AuthenticatedAgent";
      }
    | {
        "@id": "Agent";
      }
  >;
  /**
   * Denotes a class of operations that the agents can perform on a resource.
   */
  mode?: LdSet<
    | {
        "@id": "Read";
      }
    | {
        "@id": "Write";
      }
    | {
        "@id": "Append";
      }
    | {
        "@id": "Control";
      }
  >;
}
