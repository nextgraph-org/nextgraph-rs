import { defineConfig, esmExternalRequirePlugin } from "vite";
import react from "@vitejs/plugin-react";
import { nextGraphPlugin } from "@ng-org/frontend/vite";

export default defineConfig({
  plugins: [
    react(),
    nextGraphPlugin({}),
  ],
});
