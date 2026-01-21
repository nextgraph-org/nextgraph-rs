import { OrmConnection } from "./connector/ormConnectionHandler.ts";
import { DiscreteOrmConnection } from "./connector/discrete/discreteOrmConnectionHandler.ts";
import {
    useShape as svelteUseShape,
    useDiscrete as svelteUseDiscrete,
} from "./frontendAdapters/svelte/index.ts";
import {
    useShape as reactUseShape,
    useDiscrete as reactUseDiscrete,
} from "./frontendAdapters/react/index.ts";
import {
    useShape as vueUseShape,
    useDiscrete as vueUseDiscrete,
} from "./frontendAdapters/vue/index.ts";
import { initNgSignals } from "./connector/initNg.ts";
import { insertObject } from "./connector/insertObject.ts";
import { getObjects } from "./connector/getObjects.ts";
export * from "./connector/applyPatches.ts";

export {
    initNgSignals as initNg,
    OrmConnection,
    DiscreteOrmConnection,
    svelteUseShape,
    svelteUseDiscrete,
    reactUseShape,
    reactUseDiscrete,
    vueUseShape,
    vueUseDiscrete,
    insertObject,
    getObjects,
};
