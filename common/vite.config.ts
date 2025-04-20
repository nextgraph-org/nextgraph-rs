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
  ]
}
if (process.env.NG_APP_WEB) {
  config.plugins.push(jsToBottom());
}
return config
})
