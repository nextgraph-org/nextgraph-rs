import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from "svelte-preprocess";
import svelteSVG from "vite-plugin-svelte-svg";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { viteSingleFile } from "vite-plugin-singlefile"

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
export default defineConfig({
  envPrefix: ["VITE_", "NG_"],
  server: {
    port: 14401,
  },
  worker: {
      format: 'es',
      plugins : [
        topLevelAwait(),
        wasm(),
        viteSingleFile()
      ]
    },
  plugins: [
    topLevelAwait(),
    wasm(),
    svelte({
      preprocess: [
        vitePreprocess(),
        sveltePreprocess({
          typescript: false,
          postcss: true,
        }),
      ],
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
    viteSingleFile(),
    jsToBottom(),
    {
      name: 'inject-web-script',
      transformIndexHtml: {
          order: 'pre', // Tells Vite to run this before other processes
          handler: function transform(html) {
            if (!process.env.NG_DEV3) return html;
            else
              return [
              {
                  tag: "base",
                  attrs: {
                    "href": "http://localhost:14401"
                  },
                  injectTo: "head-prepend"
              }]
          }
      }
    }
    
  ]
})
