import React from "react";
import { useNextGraphAuth } from "./NextGraphAuthContext.js";
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import type { NextGraphConnectedPlugin } from "@ldo/connected-nextgraph";
/**
 * Creates special react methods specific to the NextGraph Auth
 * @param dataset the connectedLdoDataset with a nextGraphConnectedPlugin
 * @returns { BrowserNGLdoProvider, useNextGraphAuth }
 */
export declare function createBrowserNGReactMethods(dataset: ConnectedLdoDataset<(NextGraphConnectedPlugin | ConnectedPlugin)[]>): {
    BrowserNGLdoProvider: React.FunctionComponent<{
        children?: React.ReactNode | undefined;
    }>;
    useNextGraphAuth: typeof useNextGraphAuth;
};
//# sourceMappingURL=createBrowserNGReactMethods.d.ts.map