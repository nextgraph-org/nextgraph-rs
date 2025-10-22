import { nextGraphConnectedPlugin } from "@ldo/connected-nextgraph";
import { createLdoReactMethods } from "@ldo/react";
import { createBrowserNGReactMethods } from "../.auth-react";
// import {NextGraphAuth} from "@/types/nextgraph";
// import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
// import type { NextGraphConnectedPlugin, NextGraphConnectedContext } from "@ldo/connected-nextgraph";

export const {
  dataset,
  useLdo,
  useMatchObject,
  useMatchSubject,
  useResource,
  useSubject,
  useSubscribeToResource,
} = createLdoReactMethods([nextGraphConnectedPlugin]);

const methods = createBrowserNGReactMethods(dataset);

export const { BrowserNGLdoProvider, useNextGraphAuth } = methods;

// declare module "../.auth-react" {
//   export function createBrowserNGReactMethods(
//       dataset: ConnectedLdoDataset<(NextGraphConnectedPlugin | ConnectedPlugin)[]>,
//   ): {BrowserNGLdoProvider: React.FunctionComponent<{children?: React.ReactNode | undefined}>, useNextGraphAuth: typeof useNextGraphAuth}

//   export function useNextGraphAuth(): NextGraphAuth | undefined;
// }