export { default as AccountInfo} from "./AccountInfo.svelte";
export { default as Install} from "./Install.svelte";
export { default as Invitation} from "./Invitation.svelte";
export { default as NotFound} from "./NotFound.svelte";
export { default as ScanQRWeb} from "./ScanQRWeb.svelte";
export { default as Test} from "./Test.svelte";
export { default as User} from "./User.svelte";
export { default as UserRegistered} from "./UserRegistered.svelte";
export { default as WalletCreate} from "./WalletCreate.svelte";
export { default as WalletInfo} from "./WalletInfo.svelte";
export { default as WalletLogin} from "./WalletLogin.svelte";
export { default as WalletLoginQr} from "./WalletLoginQr.svelte";
export { default as WalletLoginTextCode} from "./WalletLoginTextCode.svelte";
export { default as WalletLoginUsername} from "./WalletLoginUsername.svelte";

export const redirect_server = import.meta.env.NG_REDIR_SERVER || "nextgraph.net";
export const bootstrap_redirect = import.meta.env.NG_DEV
    ? "http://localhost:1421/bootstrap.html#/?b="
    : import.meta.env.DEV
      ? "http://localhost:14403/#/?b="
      : import.meta.env.NG_DEV3
        ? "http://127.0.0.1:3033/bootstrap/#/?b="
        : `https://${redirect_server}/bootstrap/#/?b=`;

export function base64UrlEncode(str) {
  const base64 = btoa(str); // Standard Base64 encoding
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}