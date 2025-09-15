import { createSignalObjectForShape } from "./connector/createSignalObjectForShape.ts";
import { useShape as svelteUseShape } from "./frontendAdapters/svelte/index.ts";
import { useShape as reactUseShape } from "./frontendAdapters/react/index.ts";
import { useShape as vueUseShape } from "./frontendAdapters/vue/useShape.ts";
export * from "./connector/applyDiff.ts";

export {
    createSignalObjectForShape,
    svelteUseShape,
    reactUseShape,
    vueUseShape,
};
