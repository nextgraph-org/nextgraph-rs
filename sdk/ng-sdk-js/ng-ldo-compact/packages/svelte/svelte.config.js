// packages/svelte/svelte.config.js
import sveltePreprocess from "svelte-preprocess";

/** @type {import('@sveltejs/kit').Config} */ // Or just an empty object if not using Kit features
const config = {
  preprocess: sveltePreprocess({
    typescript: true, // Enable TypeScript preprocessing
    // You can add other svelte-preprocess options here if needed,
    // e.g., for SCSS, PostCSS, etc.
    // scss: { includePaths: ['theme'] },
    // postcss: true,
  }),
  // compilerOptions for Svelte if needed, though usually not for Jest transforms directly
  // compilerOptions: {
  //   customElement: false,
  // }
};

export default config;
