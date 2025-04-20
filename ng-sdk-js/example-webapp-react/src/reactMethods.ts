import { nextGraphConnectedPlugin } from "@ldo/connected-nextgraph";
import { createLdoReactMethods } from "@ldo/react";
import { createBrowserNGReactMethods } from "./createBrowserNGReactMethods";


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

