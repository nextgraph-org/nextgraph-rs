// packages/svelte/vite.config.example.ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import path from "path";

// Assuming your library's package name is "@ldo/svelte"
// and its source entry is "src/index.ts"
const libraryPackageName = "@ldo/svelte"; // Or derive from your package.json if preferred
const librarySourceEntryPoint = path.resolve(__dirname, "src/index.ts");

export default defineConfig({
  // This tells Vite that the root of your example app is the 'example' folder
  root: path.resolve(__dirname, "example"),

  // Define a different public directory for the example app if needed, default is 'public' inside the root.
  // publicDir: path.resolve(__dirname, 'example/public'),

  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        typescript: true, // Enable TypeScript in <script lang="ts">
      }),
      // Hot Module Replacement (HMR) options for Svelte
      // These are generally good defaults for development.
      hot: {
        preserveLocalState: true, // Try to preserve component state on HMR updates
      },
    }),
  ],
  resolve: {
    alias: {
      // This is a crucial alias. It makes sure that when your example app
      // imports your library (e.g., `import { ... } from '@ldo/svelte';`),
      // it uses the actual source code from your `src` directory,
      // allowing for live updates and easy testing during development.
      [libraryPackageName]: librarySourceEntryPoint,
    },
    // Important for Svelte projects to prevent issues with multiple Svelte instances.
    dedupe: ["svelte"],
  },
  server: {
    // Port for the example app's dev server
    port: 5173, // Vite's default, or choose another like 3000 or 8080
    open: true, // Automatically open the app in the browser on server start (optional)
  },
  build: {
    // Output directory for the built example app (e.g., when running `npm run build:example`)
    // This should be different from your library's `dist` directory.
    outDir: path.resolve(__dirname, "dist-example"),
    emptyOutDir: true, // Clean the output directory before building
  },
  // Ensure that dependencies from the main library are correctly resolved if linked
  // optimizeDeps: {
  //   include: ['@ldo/svelte'], // May not be necessary with the alias
  // },
});
