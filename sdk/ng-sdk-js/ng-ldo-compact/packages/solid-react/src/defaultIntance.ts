import { solidConnectedPlugin } from "@ldo/connected-solid";
import { createLdoReactMethods } from "@ldo/react";
import { createBrowserSolidReactMethods } from "./createBrowserSolidReactMethods.js";

/**
 * Default exports for just Solid methods
 */
export const {
  dataset,
  useDataset,
  useLdo,
  useMatchObject,
  useMatchSubject,
  useResource,
  useSubject,
  useSubscribeToResource,
  useLinkQuery,
  useChangeDataset,
  useChangeSubject,
  useChangeMatchObject,
  useChangeMatchSubject,
} = createLdoReactMethods([solidConnectedPlugin]);

export const { BrowserSolidLdoProvider, useSolidAuth, useRootContainerFor } =
  createBrowserSolidReactMethods(dataset);
