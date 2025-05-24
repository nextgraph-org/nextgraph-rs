import { createContext, useContext } from "react";
// There is no initial value for this context. It will be given in the provider
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const NextGraphAuthContext = createContext(undefined);
export function useNextGraphAuth() {
    return useContext(NextGraphAuthContext);
}
//# sourceMappingURL=NextGraphAuthContext.js.map