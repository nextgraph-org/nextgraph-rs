// Taken from https://github.com/comunica/comunica/blob/b237be4265c353a62a876187d9e21e3bc05123a3/engines/query-sparql/test/QuerySparql-solid-test.ts#L9

import * as path from "path";
import type { App } from "@solid/community-server";
import { AppRunner, resolveModulePath } from "@solid/community-server";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createApp(
  port: number,
  customConfigPath?: string,
): Promise<App> {
  if (process.env.SERVER) {
    return {
      start: () => {},
      stop: () => {},
    } as App;
  }
  const appRunner = new AppRunner();

  return appRunner.create({
    loaderProperties: {
      mainModulePath: resolveModulePath(""),
      typeChecking: false,
    },
    config: customConfigPath ?? resolveModulePath("config/file-root.json"),
    variableBindings: {},
    shorthand: {
      port: port,
      loggingLevel: "off",
      seedConfig: path.join(__dirname, "configs", "solid-css-seed.json"),
      rootFilePath: path.join(__dirname, `./data${port}`),
    },
  });
}
