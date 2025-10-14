import { createSignalObjectForShape } from "./connector/createSignalObjectForShape.js";
import { useShape as svelteUseShape } from "./frontendAdapters/svelte/index.js";
import { useShape as reactUseShape } from "./frontendAdapters/react/index.js";
import { useShape as vueUseShape } from "./frontendAdapters/vue/useShape.js";
export * from "./connector/applyDiff.js";

export {
    createSignalObjectForShape,
    svelteUseShape,
    reactUseShape,
    vueUseShape,
};
