import { defineConfig } from "vite";
import { internalIpV4 } from 'internal-ip'
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const host = await internalIpV4()
  const config = {
  plugins: [
    svelte({
      preprocess: [
        vitePreprocess(),
        sveltePreprocess({
          typescript: true,
          postcss: true,
        }),
      ],
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host,
      port: 5183,
    },
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri supports es2021
    target: process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
}
return config
})
