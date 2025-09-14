/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ConnectedLdoDataset, IConnectedLdoDataset } from "@ldo/connected";
import type { SolidConnectedPlugin } from "@ldo/connected-solid";
import { createSolidLdoDataset, guaranteeFetch } from "@ldo/connected-solid";

export interface Options {
  solidLdoDataset?: IConnectedLdoDataset<SolidConnectedPlugin[]>;
  fetch?: typeof fetch;
}

export function guaranteeOptions(options?: Options) {
  const fetch = guaranteeFetch(options?.fetch);
  const dataset = (options?.solidLdoDataset ??
    createSolidLdoDataset()) as ConnectedLdoDataset<SolidConnectedPlugin[]>;
  dataset.setContext("solid", { fetch });
  return { fetch, dataset };
}
