export type NextGraphUriPrefix = `did:ng`;

/**
 * A NextGraph is a URI that is valid in the NextGraph ecosystem
 */
// The & {} allows for alias preservation
// eslint-disable-next-line @typescript-eslint/ban-types
export type NextGraphUri = `${NextGraphUriPrefix}${string}` & {};
