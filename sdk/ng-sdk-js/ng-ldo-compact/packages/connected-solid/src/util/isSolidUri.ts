import type { SolidContainerUri, SolidLeafUri, SolidUri } from "../types.js";

/**
 * Checks if a provided string is a leaf URI
 * @param uri - the string to check
 * @returns true if the string is a leaf URI
 */
export function isSolidUri(uri: string): uri is SolidUri {
  try {
    const url = new URL(uri);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Checks if a provided string is a Container URI
 * @param uri - the string to check
 * @returns true if the string is a container URI
 */
export function isSolidContainerUri(uri: string): uri is SolidContainerUri {
  try {
    const url = new URL(uri);
    return url.pathname.endsWith("/");
  } catch {
    return false;
  }
}

/**
 * Checks if a provided string is a leaf URI
 * @param uri - the string to check
 * @returns true if the string is a leaf URI
 */
export function isSolidLeafUri(uri: string): uri is SolidLeafUri {
  try {
    const url = new URL(uri);
    return !url.pathname.endsWith("/");
  } catch {
    return false;
  }
}
