// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import type {
  Hash,
  NavigateOptions,
  State,
  HistoryApi,
  PreserveQuery,
  RoutingOptions,
  ExtendedInitOptions,
} from "@svelte-router/core";
import { calculateState } from "@svelte-router/core/kernel";
import { location, LocationLite, StockHistoryApi } from "@svelte-router/core";

/**
 * A lite version of the location object.  It does not support event listeners or state-setting call interceptions,
 * which are normally only needed when mixing router libraries.
 */
export class CustomLocationLite extends LocationLite {
  #historyApi: HistoryApi;
  #routingOptions: ExtendedInitOptions & { defaultHash: string };

  constructor(historyApi?: HistoryApi, routingOptions?: RoutingOptions) {
    const historyApi_ = historyApi ?? new StockHistoryApi();
    super(historyApi_);
    this.#historyApi = historyApi_;
    this.#routingOptions = {
      ...routingOptions,
      defaultHash: "ROOT_COMPONENT_ID",
      hashMode: "multi",
    };
  }

  hashPaths = $derived.by(() => {
    const result = {} as Record<string, string>;
    const paths = this.#historyApi.url.hash.substring(1).split(";");

    for (let i = 0; i < paths.length; i++) {
      const rawPath = paths[i];

      const eqIndex = rawPath.indexOf("=");
      if (eqIndex === -1) {
        // If we have a default universe route, e.g. localhost/#/some/default;foo=/bar
        if (i == 0 && rawPath != this.#routingOptions.defaultHash) {
          result[this.#routingOptions.defaultHash] = rawPath;
        }
        continue;
      }

      const id = rawPath.substring(0, eqIndex);
      const path = rawPath.substring(eqIndex + 1);
      if (!id || !path) {
        continue;
      }
      result[id] = path;
    }
    return result;
  });

  #goTo(url: string, replace: boolean, state: State | undefined) {
    if (url === "") {
      // Shallow routing.
      url = this.url.href;
    }
    this.#historyApi[replace ? "replaceState" : "pushState"](state, "", url);
  }

  navigate(url: string, options?: NavigateOptions): void {
    const resolvedHash =
      options?.hash === undefined
        ? this.#routingOptions.defaultHash
        : options?.hash;

    if (url !== "") {
      url = this.calculateHref(
        {
          ...options,
          hash: resolvedHash,
        },
        url,
      );
    }
    const newState = calculateState(resolvedHash, options?.state);
    this.#goTo(url, options?.replace ?? false, newState);
  }

  calculateMultiHashFragmentCustom(hashPaths: Record<string, string>) {
    const existingIds = new Set<string>();
    let finalUrl = "";
    // Add default path.
    if (
      hashPaths[this.#routingOptions.defaultHash] ??
      location.hashPaths[this.#routingOptions.defaultHash]
    )
      finalUrl = `;${hashPaths[this.#routingOptions.defaultHash] ?? location.hashPaths[this.#routingOptions.defaultHash]}`;

    for (let [id, path] of Object.entries(location.hashPaths)) {
      if (id === this.#routingOptions.defaultHash) continue;

      existingIds.add(id);
      path = hashPaths[id] ?? path;
      if (path) {
        finalUrl += `;${id}=${path}`;
      }
    }

    for (let [hashId, newPath] of Object.entries(hashPaths)) {
      if (hashId === this.#routingOptions.defaultHash) continue;
      if (existingIds.has(hashId) || !newPath) {
        continue;
      }
      finalUrl += `;${hashId}=${newPath}`;
    }
    return finalUrl.substring(1);
  }

  resolveHashValue(hash: Hash | undefined): Hash {
    if (hash === undefined) {
      return this.#routingOptions.defaultHash;
    }

    return hash;
  }

  calculateHref(
    ...allArgs: (CalculateHrefOptions | string | undefined)[]
  ): string {
    let options = (
      typeof allArgs[0] === "object" ? allArgs.shift() : {}
    ) as CalculateHrefOptions;
    let {
      hash = this.resolveHashValue(undefined),
      preserveQuery = false,
      preserveHash = false,
    } = options;
    const allHrefs = allArgs as (string | undefined)[];

    // Validate that no HREF contains protocol, host, or port
    for (const href of allHrefs) {
      if (href && typeof href === "string") {
        // Check for absolute URL patterns (protocol://host or //host)
        if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(href)) {
          throw new Error(
            `HREF cannot contain protocol, host, or port. Received: "${href}"`,
          );
        }
      }
    }

    const dissected = dissectHrefs(...allHrefs);
    if (hash !== false && dissected.hashes.some((h) => !!h.length)) {
      throw new Error(
        "Specifying hashes in HREF's is only allowed for path routing.",
      );
    }
    let searchParams: URLSearchParams | undefined;
    let joinedSearchParams = "";
    for (let i = 0; i < dissected.searchParams.length; ++i) {
      if (dissected.searchParams[i].length) {
        joinedSearchParams += `&${dissected.searchParams[i]}`;
      }
    }
    if (joinedSearchParams.length) {
      searchParams = new URLSearchParams(joinedSearchParams.substring(1));
    }
    searchParams = mergeQueryParams(searchParams, preserveQuery);
    const path =
      typeof hash === "string"
        ? this.calculateMultiHashFragmentCustom({
            [hash]: joinPaths(...dissected.paths),
          })
        : joinPaths(...dissected.paths);
    let hashValue =
      hash === false
        ? dissected.hashes.find((h) => h.length) ||
          (preserveHash ? location.url.hash.substring(1) : "")
        : path;
    return `${hash !== undefined ? "" : path}${searchParams ? `?${searchParams}` : ""}${hashValue.length ? `#${hashValue}` : ""}`;
  }
}

export type CalculateHrefOptions = {
  /**
   * Whether to preserve the current query parameters (or the ones specified) in the new URL.
   *
   * New URL's can specify a query string, and if query string preservation is requested, the query parameters from
   * the current URL will be appended with the ones from the new URL.
   */
  preserveQuery?: PreserveQuery;
  /**
   * Whether to preserve the current hash in the new URL.  This is only applicable when the `hash` property is set to
   * `false` (path routing universe).
   */
  preserveHash?: boolean;
  /**
   * Determines the routing universe the new URL will be for.
   *
   * Read the [online documentation](https://svelte-router.dev/docs/routing-modes) to understand
   * the concept of routing modes (or universes).
   */
  hash?: Hash;
};

/**
 * Joins the provided paths into a single path.
 * @param paths Paths to join.
 * @returns The joined path.
 */
export function joinPaths(...paths: string[]) {
  const result = paths.reduce(
    (acc, path, index) => {
      const trimmedPath = (path ?? "").replace(/^\/|\/$/g, "");
      return (
        acc +
        (index > 0 && !acc.endsWith("/") && trimmedPath.length > 0 ? "/" : "") +
        trimmedPath
      );
    },
    hasLeadingSlash(paths) ? "/" : "",
  );
  return noTrailingSlash(result);
}

function hasLeadingSlash(paths: (string | undefined)[]) {
  for (let path of paths) {
    if (!path) {
      continue;
    }
    return path.startsWith("/");
  }
  return false;
}

export function noTrailingSlash(path: string) {
  return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function mergeQueryParams(
  set1: URLSearchParams | undefined,
  set2: URLSearchParams | undefined,
): URLSearchParams | undefined;

export function mergeQueryParams(
  existingParams: URLSearchParams | undefined,
  preserveQuery?: PreserveQuery,
): URLSearchParams | undefined;
export function mergeQueryParams(
  set1: URLSearchParams | undefined,
  pqOrSet2: PreserveQuery | URLSearchParams | undefined,
): URLSearchParams | undefined {
  const set2 =
    pqOrSet2 instanceof URLSearchParams ? pqOrSet2 : location.url.searchParams;
  const preserveQuery = pqOrSet2 instanceof URLSearchParams ? true : pqOrSet2;
  if (!pqOrSet2 || !set2.size) {
    return set1;
  }

  if (!set1 && preserveQuery === true) {
    return set2;
  }

  const mergedParams = set1 ?? new URLSearchParams();

  const transferValue = (key: string) => {
    const values = set2.getAll(key);
    if (values.length) {
      values.forEach((v) => mergedParams.append(key, v));
    }
  };

  if (typeof preserveQuery === "string") {
    transferValue(preserveQuery);
  } else {
    for (let key of Array.isArray(preserveQuery)
      ? preserveQuery
      : set2.keys()) {
      transferValue(key);
    }
  }

  return mergedParams;
}

const hrefRegex = /^([^#?]*)?(?:\?([^#]*))?(?:#(.*))?$/;

export function dissectHrefs(
  ...hrefs: (string | undefined)[]
): Record<"paths" | "hashes" | "searchParams", string[]> {
  const paths: string[] = [];
  const hashes: string[] = [];
  const searchParams: string[] = [];
  for (let i = 0; i < hrefs.length; ++i) {
    if (!hrefs[i]) {
      paths.push("");
      searchParams.push("");
      hashes.push("");
      continue;
    }
    const match = hrefs[i]!.match(hrefRegex);
    paths.push(match![1] || "");
    searchParams.push(match![2] || "");
    hashes.push(match![3] || "");
  }
  return {
    paths,
    searchParams,
    hashes,
  };
}
