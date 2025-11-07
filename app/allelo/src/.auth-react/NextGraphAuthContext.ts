import { createContext, useContext } from "react";
import type {NextGraphSession} from "@/types/nextgraph";

/**
 * Functions for authenticating with NextGraph
 */
export interface NGWalletAuthFunctions {
    login: () => Promise<void>;
    logout: () => Promise<void>;
    session: NextGraphSession;
    ranInitialAuthCheck: boolean;
}

// There is no initial value for this context. It will be given in the provider
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const NextGraphAuthContext = createContext<NGWalletAuthFunctions>(undefined);

export function useNextGraphAuth(): NGWalletAuthFunctions {
    return useContext(NextGraphAuthContext);
}