// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { location } from "@svelte-router/core";
import { ROOT_COMPONENT_ID } from "./shellContext.svelte";
import { type SharedObject } from "@ng-org/frontend";

export function handleComponentRouteChange(
  reactivePayload: SharedObject,
  universeId: string,
) {
  if (reactivePayload.pathName !== undefined) {
    if (reactivePayload.pathName.includes(";")) {
      throw new Error(
        `Tried to navigate component with id ${universeId} to ${reactivePayload.pathName} but it must not include the character ';'`,
      );
    }

    if (currentMainApp?.id === universeId) {
      // Treat the main app separately. Its path is directly added on top of the root path, without scoped universe.
      const appPathName = reactivePayload.pathName ?? currentMainApp.pathName;
      const targetPath = pathJoin(currentMainApp.rootPath, appPathName ?? "");
      if (!pathEquals(targetPath, location.hashPaths[ROOT_COMPONENT_ID])) {
        location.navigate(targetPath, { hash: ROOT_COMPONENT_ID });
      }
    } else if (location.hashPaths[universeId] !== reactivePayload.pathName) {
      if (
        !pathEquals(reactivePayload.pathName, location.hashPaths[universeId])
      ) {
        location.navigate(reactivePayload.pathName, { hash: universeId });
      }
    }
  } else if (location.hashPaths[universeId]) {
    // There is still a location for this component in the shell's URL, so we give it to the component here.
    reactivePayload.pathName = location.hashPaths[universeId];
  }
}

export function handleShellRouteChange(
  reactiveChildPayloads: Record<
    string,
    {
      payload: SharedObject;
      unregister: () => void;
    }
  >,
) {
  const hashPathEntries = Object.entries(location.hashPaths);

  for (const [universe, path] of hashPathEntries) {
    if (currentMainApp && universe === ROOT_COMPONENT_ID) {
      // Handle the case that we have a "main app" (e.g. document editor)
      // whose path is mounted on top of the root path.

      // Through the split, rootPath should be undefined. If not, the root location changed.
      const [rootPath, appPath] = path.split(currentMainApp.rootPath);
      if (rootPath === "") {
        // We are all good, just the app path changed.
        if (
          reactiveChildPayloads[currentMainApp.id] &&
          !pathEquals(
            reactiveChildPayloads[currentMainApp.id].payload.pathName,
            appPath,
          )
        ) {
          reactiveChildPayloads[currentMainApp.id].payload.pathName = appPath;
        }
      } else {
        // The root path changed. That means that the main app will be unmounted
        // and there is nothing to do here.
        resetMainApp();
        return;
      }
    } else if (
      reactiveChildPayloads[universe] &&
      !pathEquals(reactiveChildPayloads[universe].payload.pathName, path)
    ) {
      reactiveChildPayloads[universe].payload.pathName = path;
    }
  }
}

type MainApp = {
  id: string;
  /** The path of the app. */
  pathName: string | undefined;
  /** The non-application part of the path, must include trailing `/` or `:`. */
  rootPath: string;
};

let currentMainApp: MainApp | undefined;

/**
 * Sets a main app whose path should be reflected on top of the default (unnamed) universe path.
 * E.g. `/<document did>/d/<here comes the path controlled by the app>`
 * @param id Application ID
 * @param rootPath The base path, which is associated with the shell. Default is the current default universe path.
 * @param appPath The path that the application should have. Default is the app's current one, if registered.
 */
export function setMainApp(id: string, rootPath?: string, appPath?: string) {
  rootPath =
    rootPath ??
    currentMainApp?.rootPath ??
    location.hashPaths[ROOT_COMPONENT_ID];

  currentMainApp = {
    id,
    rootPath,
    pathName: appPath ?? location.hashPaths[id],
  };

  const newPath = pathJoin(
    currentMainApp.rootPath ?? "/",
    currentMainApp.pathName ?? "",
  );

  // Set new shell URL.
  location.navigate(newPath, { hash: ROOT_COMPONENT_ID, replace: true });
  // Hack to remove named universe from URL.
  // @ts-expect-error
  location.navigate(undefined, { hash: id, replace: true });
}

export function resetMainApp() {
  if (!currentMainApp) return;
  location.navigate(currentMainApp.rootPath, {
    hash: ROOT_COMPONENT_ID,
    replace: true,
  });

  // Note: We do not set the app's current pathname as a named universe.
  // We assume that the app will be unmounted.

  currentMainApp = undefined;
}

/** Join path parts together. If more than  */
const pathJoin = (...parts: string[]) => {
  let res = "";

  for (const part of parts) {
    const partStartsWithSep = part.match(/^[/:]/);
    const lastSep = res.match(/([:/])$/)?.[1];
    if (!lastSep && partStartsWithSep) {
      res = res + part;
    } else if (lastSep && partStartsWithSep) {
      res = res + part.substring(1);
    } else if (!lastSep && !partStartsWithSep) {
      res = res + "/" + part;
    } else if (lastSep && !partStartsWithSep) {
      res = res + part;
    }
  }

  return res;
};

/**
 * Utility to compare two paths: `""` and `"/"` are considered to be equal.
 * Everything else is compared with string equality (`===`).
 */
const pathEquals = (path1: string | undefined, path2: string | undefined) => {
  const empty1 = path1 === "" || path1 === "/"; // || path1 === undefined;
  const empty2 = path2 === "" || path2 === "/"; // || path2 === undefined;
  if (empty1 && empty2) return true;
  return path1 === path2;
};
