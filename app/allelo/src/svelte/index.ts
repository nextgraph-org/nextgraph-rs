// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck deal with it later
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

export function push(location) {
  if (!location || location.length < 1 || (location.charAt(0) != '/' && location.indexOf('#/') !== 0)) {
        throw Error('Invalid parameter location')
    }
  window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location
}