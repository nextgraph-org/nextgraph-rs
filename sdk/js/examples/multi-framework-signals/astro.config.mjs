import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import vue from "@astrojs/vue";
import svelte from "@astrojs/svelte";

import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://astro.build/config
export default defineConfig({
    integrations: [react(), vue(), svelte()],
    srcDir: "./src/app",
    vite: {
        plugins: [topLevelAwait(), wasm()],
    },
    devToolbar: {
        enabled: false
    }
});
