import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import vue from "@astrojs/vue";
import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), vue(), svelte()],
  srcDir: "./src/app",
});
