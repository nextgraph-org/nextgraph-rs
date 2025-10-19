import * as NG from "@ng-org/lib-wasm";

export let ng: typeof NG;

export function initNg(
    ngImpl: typeof NG,
    session: {
        session_id: unknown;
        protected_store_id: unknown;
        private_store_id: unknown;
        public_store_id: unknown;
    }
) {
    ng = ngImpl;
}
