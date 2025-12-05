import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import vue from "@astrojs/vue";

export default defineConfig({
    srcDir: "./src",
    integrations: [react(), svelte(), vue()],
    server: {
        host: "127.0.0.1",
        port: 4322,
    },
});
