import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nextGraphPlugin } from "@ng-org/frontend/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nextGraphPlugin({}),
  ],
});
