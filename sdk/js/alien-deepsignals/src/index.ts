export {
    deepSignal,
    getDeepSignalRootId,
    getDeepSignalVersion,
    subscribeDeepMutations,
    shallow,
    peek,
    isDeepSignal,
} from "./deepSignal";
export type {
    DeepPatch,
    DeepPatchBatch,
    DeepSignal,
    DeepSignalOptions,
    DeepPatchSubscriber,
} from "./deepSignal";
export { watch } from "./watch";
export { effect } from "./effect";
