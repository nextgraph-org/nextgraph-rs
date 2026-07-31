// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { readFileSync } from "fs";
import type { Plugin, UserConfig } from "vite";
import { esmExternalRequirePlugin } from "vite";
import vitePluginSingleSpa from "vite-plugin-single-spa";
import externalize from "./vite-plugin-externalize-dependencies.ts";

const preamble = (port: number) => {
  const base = `http://localhost:${port}`;
  const reactRefreshUrl = `${base}/@react-refresh`;
  const refreshPreamble =
    `\n// == ng-refresh-preamble ==\n` +
    `if (!window.$RefreshReg$) {\n` +
    `  window.$RefreshReg$ = () => {};\n` +
    `  window.$RefreshSig$ = () => (type) => type;\n` +
    `  window.__vite_plugin_react_preamble_installed__ = true;\n` +
    `}\n` +
    //`console.log("[ng-refresh] importing runtime", "${reactRefreshUrl}");\n` +
    // `import * as RefreshRuntime from "${reactRefreshUrl}";\n` +
    `const RefreshRuntime = await import("${reactRefreshUrl}");\n` +
    //`console.log("[ng-refresh] imported from ${reactRefreshUrl}");\n` +
    `if (!window.__RegisteredReactRefreshRuntimes__) { window.__RegisteredReactRefreshRuntimes__ = {}}\n` +
    `if (!window.__RegisteredReactRefreshRuntimes__["${reactRefreshUrl}"]) {\n` +
    `  window.__RegisteredReactRefreshRuntimes__["${reactRefreshUrl}"] = true;\n` +
    `  RefreshRuntime.injectIntoGlobalHook(window);\n` +
    `}\n` +
    `// == End preamble ==\n`;
  return refreshPreamble;
};

export const externalDependencies = [
  "react",
  "react-dom",
  /^react\/.*/,
  /^react-dom\/.*/,
  "react-router",
  "@ng-org/alien-deepsignals",
  "@ng-org/alien-deepsignals/svelte",
  "@ng-org/alien-deepsignals/vue",
  "@ng-org/alien-deepsignals/react",

  /^@ng-org\/frontend$/,
  // We need to share the context so that
  // parent components inject the same context that the child components consume.
  /@ng-org\/frontend\/react\/context$/,

  "single-spa",

  "vue",

  "svelte",
  /^svelte\/.*/,
  "fast-deep-equal",
  "fast-deep-equal/es6/react.js",
  "use-sync-external-store/shim/with-selector.js",
  "use-sync-external-store/shim/index.js", 
  "use-sync-external-store/shim/with-selector"
];

export function nextGraphPlugin({
  origin,
  base,
}: {
  origin?: string;
  base?: string;
}): Plugin[] {
  const manifest = JSON.parse(
    readFileSync("./src/ng-manifest.json", { encoding: "utf8" }) as string,
  );
  const port = manifest.port;
  const entryPoints = manifest.entryPoints.map(
    (ep: { path: string; name: string }) => ep.path,
  );
  console.log(manifest.name);
  console.log(entryPoints);

  // TODO: Is this necessary
  origin = origin ?? base ?? `http://localhost:${port}`;
  //base = base ?? origin ?? `http://localhost:${port}`;

  let mode: string;

  let ext: (string | RegExp)[] = [];

  return [
    {
      name: "vite-plugin-nextgraph",
      enforce: "pre",
      config(userConfig, env) {
        mode = env.mode;
        let config: UserConfig = {
          server: {
            port,
            strictPort: true,
            origin,
          },
          base: process.env.NG_ENV_DIST_FOLDER,
          optimizeDeps: {
            // Necessary?
            noDiscovery: env.mode !== "standalone",
          },
          build: {
            // TODO: Necessary? If so, in dev only
            modulePreload: false,
            minify: "oxc",
            // cssCodeSplit: false,
          },
        };
        if (env.mode === "standalone") return config;

        if (env.mode == "development") {
          ext.push(...externalDependencies);
          return config;
        }
        if (typeof userConfig.build?.rollupOptions?.external === "function") {
          throw new Error(
            "Using a function for rollup externals is not supported in combination with vite-plugin-nextgraph. Talk to Laurin if you see this error",
          );
        }
        if (typeof userConfig.build?.rolldownOptions?.external === "function") {
          throw new Error(
            "Using a function for rollup externals is not supported in combination with vite-plugin-nextgraph. Talk to Laurin if you see this error",
          );
        }
        const existing =
          [
            userConfig.build?.rollupOptions?.external ?? [],
            userConfig.build?.rolldownOptions?.external ?? [],
          ].flat() ?? [];
        // We merge everything into the rollupOptions so we don't need them here.
        if (userConfig.build?.rolldownOptions?.external)
          userConfig.build.rolldownOptions.external = undefined;

        config.build = {
          rolldownOptions: {
            external: [...existing, ...externalDependencies],
            plugins: [
              esmExternalRequirePlugin({
                external: ["react"],
              }),
            ],
          },
        };

        return config;
      },
    },
    externalize({ externals: ext }),
    {
      ...vitePluginSingleSpa({
        type: mode! === "standalone" ? "root" : "mife",
        serverPort: port,
        spaEntryPoints: entryPoints,
        cssStrategy: "multiMife",
        // logging: {
        //   fileName "./dist/single-spa.log",
        //   chunks: true,
        //   config: true,
        //   incomingConfig: true,
        // },
      }),
    },
    {
      name: "vite-plugin-nextgraph-react-refresh-patch",
      apply(_, { mode, command }) {
        // apply only when not in standalone and when serve
        return mode !== "standalone" && command === "serve";
      },
      enforce: "post",

      transform(code, id) {
        const normalizedId = id.split("?", 1)[0];
        if (!/\.[tj]sx?$/.test(normalizedId)) return;
        if (code.includes("ng-refresh-preamble")) return;

        if (code.includes("/@react-refresh")) {
          code = code.replace(
            /import\s+\*\s+as\s+RefreshRuntime\s+from\s+["']\/\@react-refresh["'];?\s*/g,
            "",
          );
          return `${preamble(port)}${code}`;
        } else {
          return code;
        }
      },
    },
  ];
}
