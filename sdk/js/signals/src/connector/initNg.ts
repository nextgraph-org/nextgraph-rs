import * as NG from "@ng-org/lib-wasm";

type Session = {
    session_id: unknown;
    protected_store_id: unknown;
    private_store_id: unknown;
    public_store_id: unknown;
};

let resolveNgSession: (value: { ng: typeof NG; session: Session }) => void;

export const ngSession = new Promise<{ ng: typeof NG; session: Session }>(
    (resolve) => {
        resolveNgSession = resolve;
    }
);

export function initNg(ngImpl: typeof NG, session: Session) {
    resolveNgSession({ ng: ngImpl, session });
}
