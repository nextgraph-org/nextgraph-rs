import { ng, init as initNgWeb } from "@ng-org/web";
import { initNg as initNgSignals } from "@ng-org/orm";
import type * as NG from "@ng-org/lib-wasm";

export let session: NextGraphSession | undefined;

let resolveSessionPromise: (
    value: NextGraphSession | PromiseLike<NextGraphSession>
) => void;
let rejectSessionPromise: (reason?: any) => void;

export let sessionPromise: Promise<NextGraphSession> = new Promise(
    (resolve, reject) => {
        resolveSessionPromise = resolve;
        rejectSessionPromise = reject;
    }
);

export async function init() {
    await initNgWeb(
        async (event: any) => {
            session = event.session;

            session!.ng ??= ng;
            resolveSessionPromise(session!);

            initNgSignals(ng, session!);
        },
        true,
        []
    ).catch((error) => {
        rejectSessionPromise(error);
    });
}

export interface NextGraphSession {
    ng: typeof NG;
    privateStoreId?: string;
    protectedStoreId?: string;
    session_id: string;
    protected_store_id: string;
    private_store_id: string;
    public_store_id: string;
    [key: string]: unknown;
}
