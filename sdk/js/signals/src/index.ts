import { createSignalObjectForShape } from "./connector/createSignalObjectForShape.js";
import { useShape as svelteUseShape } from "./frontendAdapters/svelte/index.js";
import { useShape as reactUseShape } from "./frontendAdapters/react/index.js";
import { useShape as vueUseShape } from "./frontendAdapters/vue/useShape.js";
import { initNgSignals } from "./connector/initNg.ts";
export * from "./connector/applyPatches.ts";

export {
    initNgSignals as initNg,
    createSignalObjectForShape,
    svelteUseShape,
    reactUseShape,
    vueUseShape,
};
