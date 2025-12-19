import { createSignalObjectForShape } from "./connector/createSignalObjectForShape.ts";
import { useShape as svelteUseShape } from "./frontendAdapters/svelte/index.ts";
import { useShape as reactUseShape } from "./frontendAdapters/react/index.ts";
import { useShape as vueUseShape } from "./frontendAdapters/vue/useShape.ts";
import { initNgSignals } from "./connector/initNg.ts";
export * from "./connector/applyPatches.ts";

export {
    initNgSignals as initNg,
    createSignalObjectForShape,
    svelteUseShape,
    reactUseShape,
    vueUseShape,
};
