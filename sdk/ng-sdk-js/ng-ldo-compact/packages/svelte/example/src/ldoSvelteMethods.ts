import { createLdoSvelteMethods } from "@ldo/svelte";
import { solidConnectedPlugin } from "@ldo/connected-solid";

export const {
  dataset,
  useLdo,
  useMatchObject,
  useMatchSubject,
  useResource,
  useSubject,
  useSubscribeToResource,
  useLinkQuery,
} = createLdoSvelteMethods([solidConnectedPlugin]);

// At some point when you log in, you'll need to set context on the dataset with
// the authentication information. For example, in Solid, you would run:
// dataset.setContext("solid", { fetch: authFetch });
