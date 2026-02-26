import { ng, init as initNgWeb } from "@ng-org/web";
import {
    initNg as initNgSignals,
    type Session as NextGraphSession,
} from "@ng-org/orm";

/** The session with the NextGraph engine or undefined if not loaded. */
export let session: NextGraphSession | undefined;

let resolveSessionPromise: (
    value: NextGraphSession | PromiseLike<NextGraphSession>
) => void;
let rejectSessionPromise: (reason?: any) => void;

/** Resolves to the current NextGraph session. */
export let sessionPromise: Promise<NextGraphSession> = new Promise(
    (resolve, reject) => {
        resolveSessionPromise = resolve;
        rejectSessionPromise = reject;
    }
);

/** Call as early in your app as possible so that the page is redirected to auth. */
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
