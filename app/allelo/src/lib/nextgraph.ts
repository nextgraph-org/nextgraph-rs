import { createBrowserNGReactMethods } from "../.auth-react";

const methods = createBrowserNGReactMethods();

export const { BrowserNGLdoProvider, useNextGraphAuth } = methods;

// declare module "../.auth-react" {
//   export function createBrowserNGReactMethods(
//       dataset: ConnectedLdoDataset<(NextGraphConnectedPlugin | ConnectedPlugin)[]>,
//   ): {BrowserNGLdoProvider: React.FunctionComponent<{children?: React.ReactNode | undefined}>, useNextGraphAuth: typeof useNextGraphAuth}

//   export function useNextGraphAuth(): NextGraphAuth | undefined;
// }