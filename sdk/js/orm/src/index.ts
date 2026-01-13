import { OrmConnection } from "./connector/ormConnectionHandler.ts";
import { useShape as svelteUseShape } from "./frontendAdapters/svelte/index.ts";
import { useShape as reactUseShape } from "./frontendAdapters/react/index.ts";
import { useShape as vueUseShape } from "./frontendAdapters/vue/useShape.ts";
import { initNgSignals } from "./connector/initNg.ts";
import { insertObject } from "./connector/insertObject.ts";
import { getObjects } from "./connector/getObjects.ts";
export * from "./connector/applyPatches.ts";

export {
    initNgSignals as initNg,
    OrmConnection,
    svelteUseShape,
    reactUseShape,
    vueUseShape,
    insertObject,
    getObjects,
};
