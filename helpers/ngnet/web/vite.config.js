import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from "svelte-preprocess";
import svelteSVG from "vite-plugin-svelte-svg";

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: ["VITE_", "NG_"],
  server: {
    allowedHosts: []
  },
    plugins: [svelte({
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
  }),],
})
