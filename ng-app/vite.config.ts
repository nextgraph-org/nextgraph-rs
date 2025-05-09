import { defineConfig } from "vite";
import { internalIpV4 } from 'internal-ip'
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import { viteSingleFile } from "vite-plugin-singlefile"
import svelteSVG from "vite-plugin-svelte-svg";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

const jsToBottom = () => {
  return {
    name: "script-at-end-of-body",
    transformIndexHtml(html) {
      let scriptTag = html.match(/<script type[^>]*>(.*?)<\/script[^>]*>/)[0]
      //console.log("\n SCRIPT TAG", scriptTag, "\n")
      html = html.replace(scriptTag, "")
      html = html.replace("<!-- # INSERT SCRIPT HERE -->", scriptTag)
      return html;
    }
  }
}


// https://vitejs.dev/config/
export default defineConfig(async () => {
  const host = await internalIpV4()
  const config = {
  optimizeDeps: {
    exclude: ["codemirror", "@codemirror/*", "@codemirror/language", "@codemirror/state", "@codemirror/view","@codemirror/legacy-modes/mode/sparql",
    "@codemirror/lang-javascript", "@codemirror/lang-rust", "@replit/codemirror-lang-svelte", "yjs", "y-codemirror.next", "svelte-codemirror-editor",
    "prosemirror-svelte", "prosemirror-svelte/state", "prosemirror-svelte/helpers", "y-prosemirror", "prosemirror-state", "prosemirror-model", "prosemirror-view", "y-protocols",
    "@milkdown/core", "@milkdown/ctx", "@milkdown/prose", "@milkdown/transformer", "@milkdown/preset-commonmark", "@milkdown/theme-nord", "@milkdown/plugin-collab",
    "svelte-highlight", "svelte-highlight/languages/typescript", "svelte-highlight/languages/markdown", "svelte-highlight/languages/xml", "svelte-highlight/languages/javascript", "svelte-highlight/languages/rust", "@milkdown/preset-gfm",
    "@milkdown-lab/plugin-split-editing", "@milkdown/plugin-slash", "@milkdown/utils", "@milkdown/plugin-prism", "@milkdown/plugin-emoji", "@milkdown/plugin-indent",
    "svelte-jsoneditor", "@automerge/automerge/next", "@automerge/automerge/slim"],

    include: ["debug","extend","highlight.js","highlight.js/lib/core","lodash.debounce","@sindresorhus/is","char-regex","emojilib","skin-tone",
      'immutable-json-patch', "xml-beautifier" ]
      
  },
  worker: {
    format: 'es',
    plugins : [
      topLevelAwait(),
      wasm(),
    ]
  },
  plugins: [
    topLevelAwait(),
    wasm(),
    svelte({
      preprocess: [
        vitePreprocess(),
        sveltePreprocess({
          typescript: true,
          postcss: true,
        }),
      ],
      onwarn: (warning, handler) => {
        if (warning.code === 'css-unused-selector') {
            return;
        }
        handler(warning);
      },
    }),
    svelteSVG({
      svgoConfig: {
        plugins: [
            {
                name: 'preset-default',
                params: {
                  overrides: {
                    // disable plugins
                    removeViewBox: false,
                  },
                },
            },
            {
              name: 'prefixIds',
            }
        ],
      }, // See https://github.com/svg/svgo#configuration
      requireSuffix: true, // Set false to accept '.svg' without the '?component'
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: process.env.NG_APP_WEB ? 1421 : 1420,
    host: '0.0.0.0',
    strictPort: true,
    // fs: {
    //   // Allow serving files from one level up to the project root
    //   allow: ['..'],
    // },
    hmr: {
      protocol: 'ws',
      host,
      port: process.env.NG_APP_WEB ? 5184 : 5183,
    }
  },
  publicDir: process.env.NG_PUBLIC_DEV ? "public_dev" : false,
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_", "NG_"],
  build: {
    outDir: process.env.NG_APP_WEB ? process.env.NG_APP_FILE ? 'dist-file' : 'dist-web' : 'dist',
    // Tauri supports es2021
    target: process.env.NG_APP_WEB ? 'modules' : process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  }
}
if (process.env.NG_APP_FILE) {
  config.plugins.push(viteSingleFile());
  config.worker.plugins.push(viteSingleFile());
}
if (process.env.NG_APP_WEB) {
  config.plugins.push(jsToBottom());
}
return config
})
