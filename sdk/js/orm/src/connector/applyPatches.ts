// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { batch } from "@ng-org/alien-deepsignals";
import { decodePathSegment } from "./utils.ts";

/** @ignore */
export type Patch = {
    /** Property path (array indices, object keys, synthetic Set entry ids) from the root to the mutated location. */
    path: string;
    valType?: string & {};
    value?: unknown;
} & (SetAddPatch | SetRemovePatch | RemovePatch | LiteralAddPatch);

/** @ignore */
export interface SetAddPatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "add";
    valType: "set";
    /**
     * New value for set mutations:
     *  - A single primitive
     *  - An array of primitives
     */
    value: number | string | boolean | (number | string | boolean)[];
}

/** @ignore */
export interface SetRemovePatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "remove";
    valType: "set";
    /**
     * The value(s) to be removed from the set. Either:
     *  - A single primitive
     *  - An array of primitives
     */
    value:
        | number
        | string
        | boolean
        | object
        | (number | string | boolean | object)[];
}

/** @ignore */
export interface RemovePatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "remove";
}

/** @ignore */
export interface LiteralAddPatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "add";
    /** The literal value to be added at the resolved `path` */
    value: string | number | boolean | object;
}

/**
 * @ignore
 *
 * Apply a diff to an object.
 *
 * The syntax is is based on JSON Patch RFC 6902.
 *
 *
 * @param currentState The object before the patch
 * @param patches An array of patches to apply to the object.
 * @param ensurePathExists If true, create nested objects along the path if the path does not exist.
 *
 * Note: When creating new objects, this function pre-scans upcoming patches to find `@id` and `@graph`
 *       values that will be assigned to the object. This prevents the signal library's onObjectAttached
 *       from being triggered before these identity fields are set, which would cause it to generate
 *       random IDs unnecessarily.
 */
export function applyPatches(
    currentState: Record<string, any>,
    patches: Patch[],
    ensurePathExists: boolean = false
) {
    for (let patchIndex = 0; patchIndex < patches.length; patchIndex++) {
        const patch = patches[patchIndex];
        if (!patch.path.startsWith("/")) continue;
        const pathParts = patch.path
            .slice(1)
            .split("/")
            .filter(Boolean)
            .map(decodePathSegment);

        if (pathParts.length === 0) {
            // Actually, this should mean replace..
            console.warn("[applyPatches] No path specified for patch", patch);
            continue;
        }
        const lastKey = pathParts[pathParts.length - 1];
        let parentVal: any = currentState;
        let parentMissing = false;
        // Traverse only intermediate segments (to leaf object at path)
        for (let i = 0; i < pathParts.length - 1; i++) {
            const seg = pathParts[i];

            // Handle regular objects
            if (
                parentVal != null &&
                typeof parentVal === "object" &&
                Object.prototype.hasOwnProperty.call(parentVal, seg)
            ) {
                parentVal = parentVal[seg];
                continue;
            }
            if (ensurePathExists) {
                if (parentVal !== null && typeof parentVal === "object") {
                    // Create a new object
                    parentVal[seg] = {};

                    parentVal = parentVal[seg];
                } else {
                    parentMissing = true;
                    break;
                }
            } else {
                parentMissing = true;
                break;
            }
        }

        if (parentMissing) {
            console.warn(
                `[applyPatches] Skipping patch due to missing parent path segment(s): ${patch.path}`
            );
            continue;
        }

        // parentVal now should be an object or array into which we apply lastKey
        if (parentVal == null || typeof parentVal !== "object") {
            console.warn(
                `[applyPatches] Skipping patch because the path is invalid. Path`,
                patch.path,
                "root object:",
                currentState
            );
            continue;
        }
        const key = lastKey;

        if (Array.isArray(parentVal)) {
            if (key === "-") {
                if (patch.op == "add") {
                    parentVal.push(patch.value);
                } else {
                    parentVal.pop();
                }
            } else if (patch.op == "add") {
                let keyNum = Number(key);
                parentVal.splice(keyNum, 0, patch.value);
            } else {
                // patch.op == remove
                let keyNum = Number(key);
                // Remove element at position from array in-place (will resize).
                parentVal.splice(keyNum, 1);
            }

            continue;
        }

        // Basic add
        if (patch.op === "add") {
            parentVal[key] = (patch as LiteralAddPatch).value;
            continue;
        }

        // Generic remove (property or value)
        if (patch.op === "remove") {
            if (Object.prototype.hasOwnProperty.call(parentVal, key)) {
                delete parentVal[key];
            }
            continue;
        }
    }
}

/**
 * @ignore
 *
 * See documentation for applyPatches
 */
export function applyPatchesToDeepSignal(currentState: object, patch: Patch[]) {
    batch(() => {
        applyPatches(currentState as Record<string, any>, patch, false);
    });
}

// TODO: Remove based on objects @id
