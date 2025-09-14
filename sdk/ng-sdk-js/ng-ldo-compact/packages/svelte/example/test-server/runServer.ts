// Taken from https://github.com/comunica/comunica/blob/b237be4265c353a62a876187d9e21e3bc05123a3/engines/query-sparql/test/QuerySparql-solid-test.ts#L9
import type { App } from "@solid/community-server";
import { AppRunner, resolveModulePath } from "@solid/community-server";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const app = await createApp(
    3004,
    path.join(
      __dirname,
      "./configs/components-config/unauthenticatedServer.json",
    ),
  );
  await app.start();
}
run();

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
      seedConfig: path.join(__dirname, "configs", "solid-css-seed.json"),
      rootFilePath: path.join(__dirname, `./data${port}`),
    },
  });
}
