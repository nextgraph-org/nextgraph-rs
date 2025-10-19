import * as NG from "@ng-org/lib-wasm";

export let ng: typeof NG;

export function initNg(ngImpl: typeof NG) {
    ng = ngImpl;
}
