import { createLdoReactMethods } from "../src/createLdoReactMethods.js";
import { mockConnectedPlugin } from "../../connected/test/mocks/MockConnectedPlugin.js";

export const {
  dataset,
  useLdo,
  useMatchObject,
  useMatchSubject,
  useResource,
  useSubject,
  useSubscribeToResource,
  useLinkQuery,
  useChangeDataset,
  useChangeSubject,
  useChangeMatchSubject,
  useChangeMatchObject,
} = createLdoReactMethods([mockConnectedPlugin]);
