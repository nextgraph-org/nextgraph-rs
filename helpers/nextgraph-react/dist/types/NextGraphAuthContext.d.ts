/**
 * Functions for authenticating with NextGraph
 */
export interface NGWalletAuthFunctions {
    login: () => Promise<void>;
    logout: () => Promise<void>;
    session: unknown;
    ranInitialAuthCheck: boolean;
}
export declare const NextGraphAuthContext: import("react").Context<NGWalletAuthFunctions>;
export declare function useNextGraphAuth(): NGWalletAuthFunctions;
//# sourceMappingURL=NextGraphAuthContext.d.ts.map