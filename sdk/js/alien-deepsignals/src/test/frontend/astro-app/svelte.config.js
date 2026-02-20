import { vitePreprocess } from "@astrojs/svelte";

const config = {
    preprocess: [vitePreprocess()],
};

export default config;
