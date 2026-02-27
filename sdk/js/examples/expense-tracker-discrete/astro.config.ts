import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import vue from "@astrojs/vue";
import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
    integrations: [react(), vue(), svelte()],
    srcDir: "./src/app-wrapper",
    vite: {
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
