import type { NextGraphUri } from "../types.js";

/**
 * Checks if a provided string is a leaf URI
 * @param uri - the string to check
 * @returns true if the string is a leaf URI
 */
export function isNextGraphUri(uri: string): uri is NextGraphUri {
  return uri.startsWith("did:ng");
}
