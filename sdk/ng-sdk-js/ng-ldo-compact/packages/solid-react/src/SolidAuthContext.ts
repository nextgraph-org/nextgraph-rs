import type {
  ISessionInfo,
  ILoginInputOptions,
} from "@inrupt/solid-client-authn-core";
import { createContext, useContext } from "react";

export type SessionInfo = ISessionInfo;
export type LoginOptions = ILoginInputOptions;

/**
 * Functions for authenticating with Solid
 */
export interface SolidAuthFunctions {
  login: (issuer: string, loginOptions?: LoginOptions) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (issuer: string, loginOptions?: LoginOptions) => Promise<void>;
  fetch: typeof fetch;
  session: SessionInfo;
  ranInitialAuthCheck: boolean;
}

// There is no initial value for this context. It will be given in the provider
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const SolidAuthContext = createContext<SolidAuthFunctions>(undefined);

export function useSolidAuth(): SolidAuthFunctions {
  return useContext(SolidAuthContext);
}
