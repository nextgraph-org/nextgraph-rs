import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import vue from "@astrojs/vue";
import svelte from "@astrojs/svelte";
import solidJs from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
    integrations: [
        react({
            include: ["**/react/**", "*/ReactRoot.tsx"],
        }),
        vue(),
        svelte(),
        solidJs({
            include: [
                "**/solid-js/**",
                "**/node_modules/@suid/material/**",
                "**/SolidJsRoot.tsx",
            ],
            devtools: true,
        }),
    ],
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
