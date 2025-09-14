import type { ConnectedContext, ConnectedPlugin } from "@ldo/connected";
import type { SolidContainerUri, SolidLeafUri, SolidUri } from "./types.js";
import { SolidLeaf } from "./resources/SolidLeaf.js";
import { SolidContainer } from "./resources/SolidContainer.js";
import { isSolidContainerUri, isSolidUri } from "./util/isSolidUri.js";

/**
 * The Type of the SolidConnectedContext
 */
export interface SolidConnectedContext {
  fetch?: typeof fetch;
}
export interface SolidConnectedPlugin
  extends ConnectedPlugin<
    "solid",
    SolidUri,
    SolidLeaf | SolidContainer,
    SolidConnectedContext,
    undefined
  > {
  name: "solid";
  getResource:
    | ((uri: SolidLeafUri, context: ConnectedContext<this[]>) => SolidLeaf)
    | ((
        uri: SolidContainerUri,
        context: ConnectedContext<this[]>,
      ) => SolidContainer);
  createResource(context: ConnectedContext<this[]>): Promise<SolidLeaf>;
}

function getResource(
  uri: SolidLeafUri,
  context: ConnectedContext<SolidConnectedPlugin[]>,
): SolidLeaf;
function getResource(
  uri: SolidContainerUri,
  context: ConnectedContext<SolidConnectedPlugin[]>,
): SolidContainer;
function getResource(
  uri: SolidLeafUri | SolidContainerUri,
  context: ConnectedContext<SolidConnectedPlugin[]>,
): SolidLeaf | SolidContainer {
  if (isSolidContainerUri(uri)) {
    return new SolidContainer(uri, context);
  } else {
    return new SolidLeaf(uri, context);
  }
}

/**
 * This plugin can be given to a ConnectedDataset to let it connect to Solid
 * servers.
 *
 * @example
 * ```
 * import { createConnectedLdoDataset } from "@ldo/connected";
 * import { solidConnectedPlugin } from "@ldo/connected-solid";
 *
 * const solidConnectedDataset = createConnectedLdoDataset([
 *   solidConnectedPlugin
 * ]);
 * ```
 */
export const solidConnectedPlugin: SolidConnectedPlugin = {
  name: "solid",

  getResource,

  createResource: function (): Promise<SolidLeaf> {
    throw new Error("Function not implemented.");
  },

  isUriValid: function (uri: string): uri is SolidLeafUri | SolidContainerUri {
    return isSolidUri(uri);
  },

  initialContext: {
    fetch: undefined,
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore "Types" only exists for the typing system
  types: {},

  normalizeUri(uri: SolidUri): SolidUri {
    const url = new URL(uri);
    url.hash = "";
    url.search = "";
    return url.toString() as SolidUri;
  },
};
