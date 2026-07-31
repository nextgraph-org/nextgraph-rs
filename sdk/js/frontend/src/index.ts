export * from "./utils/types.ts";
export * from "./utils/appLoader.ts";

export function cleanFilename(url: string) {
  let parts = url.split("/");
  let lastpart = parts[parts.length - 1];
  parts = lastpart.split(".");
  lastpart = parts[parts.length - 2];
  return lastpart;
}
