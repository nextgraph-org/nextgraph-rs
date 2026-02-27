import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import vue from "@astrojs/vue";
import svelte from "@astrojs/svelte";

import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://astro.build/config
export default defineConfig({
    integrations: [react(), vue(), svelte()],
    srcDir: "./src/app-wrapper",
    vite: {
        plugins: [topLevelAwait(), wasm()],
        server: {
            strictPort: true,
            hmr: {
                clientPort: 5183,
            },
        },
        envPrefix: ["NG_"],
    },
    server: {
        port: 5183,
    },
    devToolbar: {
        enabled: false,
    },
});
