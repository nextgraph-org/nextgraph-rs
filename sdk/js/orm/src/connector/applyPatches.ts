// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import {
    addWithId,
    DeepSignalObject,
    DeepSignalSet,
} from "@ng-org/alien-deepsignals";
import { decodePathSegment } from "./utils.ts";

/** @ignore */
export type Patch = {
    /** Property path (array indices, object keys, synthetic Set entry ids) from the root to the mutated location. */
    path: string;
    valType?: string & {};
    value?: unknown;
} & (SetAddPatch | SetRemovePatch | RemovePatch | LiteralAddPatch | MovePatch);

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

/** @ignore Move for items in the same array currently only */
export interface MovePatch {
    /** Move. */
    op: "move";
    path: string;
    from: string;
}

/**
 * @ignore
 *
 * Apply a diff to a deep signal object.
 *
 * The syntax is is based on JSON Patch RFC 6902.
 *
 * It supports Sets for multi-valued properties. Add `valType: "set"` to a {@link Patch},
 * to add literals or values as sets.
 *
 * Path traversal:
 *   - When traversing through a Set, the path segment is the synthetic id of a deep signal set.
 *   - When traversing through a plain object, the path segment is a property name
 *
 * @param currentState The deep signal object before the patches
 * @param patches An array of patches to apply to the object.
 * @param ensurePathExists If true, create nested objects along the path if the path does not exist.
 *
 */
export function applyPatches(
    currentState: DeepSignalObject<any>,
    patches: Patch[]
) {
    for (let patchIndex = 0; patchIndex < patches.length; patchIndex++) {
        const patch = patches[patchIndex];
        if (!patch.path.startsWith("/")) continue;
        const pathParts = patch.path
            .slice(1)
            .split("/")
            .filter(Boolean)
            .map(decodePathSegment);

        const lastKey = pathParts[pathParts.length - 1];
        let parentVal: any = currentState;
        let parentMissing = false;
        // Traverse only intermediate segments (to leaf object at path)
        for (let i = 0; i < pathParts.length - 1; i++) {
            const seg = pathParts[i];

            // Handle Sets: if parentVal is a Set, seg should be a synthetic id.
            if (parentVal instanceof Set) {
                const foundObj = (parentVal as DeepSignalSet<any>).getById(seg);
                if (foundObj) {
                    parentVal = foundObj;
                    continue;
                } else {
                    parentMissing = true;
                    break;
                }
            }

            // Handle regular objects
            if (
                parentVal != null &&
                typeof parentVal === "object" &&
                Object.prototype.hasOwnProperty.call(parentVal, seg)
            ) {
                parentVal = parentVal[seg];
                continue;
            }
            parentMissing = true;
            break;
        }

        if (parentMissing) {
            console.warn(
                `[applyPatches] Skipping patch due to missing parent path segment(s): ${patch.path}`
            );
            continue;
        }

        // parentVal now should be an object, array, or set which contains lastKey.
        if (parentVal === null || typeof parentVal !== "object") {
            console.warn(
                `[applyPatches] Skipping patch because the path is invalid. Path`,
                patch.path,
                "root object:",
                currentState
            );
            continue;
        }
        const key = lastKey;

        if (typeof patch.value === "object") {
            // Ensure that arrays are converted to sets.
            patch.value = parseOrmInitialObject(patch.value);
        }

        if (patch.valType === "set") {
            if (patch.op === "add") {
                // If target is a set already, just add it.
                if (parentVal[key] instanceof Set) {
                    for (const v of [patch.value].flat()) {
                        parentVal[key].add(v);
                    }
                } else if (parentVal instanceof Set) {
                    // Parent is a set -> key is a synthetic id to be used for the object added to the parent set.
                    addWithId(parentVal, patch.value, key);
                } else if (parentVal[key] === undefined) {
                    // If the target doesn't exist, create a new set.
                    parentVal[key] = new Set([patch.value].flat());
                } else {
                    // Tried to add to a set but path target is not a set.
                    console.warn(
                        "Tried to add to a set but path target is not a set",
                        patch,
                        parentVal
                    );
                }
            } else {
                // patch.op === "remove"

                if (isPrimitive(patch.value) || Array.isArray(patch.value)) {
                    if (parentVal[key] instanceof Set) {
                        // Remove one or more primitives from set (array of objects don't exist).
                        for (const v of [patch.value].flat())
                            parentVal[key].delete(v);
                    } else {
                        console.warn(
                            "Path target is not a set",
                            patch,
                            parentVal[key]
                        );
                    }
                } else if (parentVal instanceof Set) {
                    // Parent is a set, key must be a synthetic id to an object.
                    if (patch.value === undefined) {
                        const targetedObject = (
                            parentVal as DeepSignalSet<any>
                        ).getById(key);
                        parentVal.delete(targetedObject);
                    }
                } else if (parentVal[key] instanceof Set) {
                    // if path target points to a set,
                    // value is an object with @id as an identifier.

                    const id = (patch.value as any)["@id"];
                    if (!id) {
                        console.warn(
                            "Cannot remove patch value from parent set without @id",
                            patch,
                            parentVal
                        );
                        continue;
                    }
                    let objectsWithId = parentVal[key]
                        .values()
                        .filter((child) => child["@id"] === id);
                    for (const objectToRemove of objectsWithId) {
                        parentVal[key].delete(objectToRemove);
                    }
                } else {
                    console.warn(
                        "Invalid patch:",
                        patch,
                        "Cannot remove value as a set value from parent",
                        parentVal
                    );
                }
            }
            continue;
        }
        if (key === undefined) {
            // Up to hear it might have been that path was "/" and valType set (adding to the root).
            // If not, this patch is invalid.
            console.warn("Key is missing for patch", patch);
            continue;
        }

        if (Array.isArray(parentVal)) {
            if (key === "-") {
                if (patch.op === "add") {
                    parentVal.push(patch.value);
                } else {
                    parentVal.pop();
                }
            } else if (patch.op === "add") {
                let keyNum = Number(key);
                parentVal.splice(keyNum, 0, patch.value);
            } else if (patch.op === "move") {
                const [, fromIndex] = patch.from.match(/.*\/([0-9]+)$/)!;
                const [, toIndex] = patch.path.match(/.*\/([0-9]+)$/)!;
                const [removed] = parentVal.splice(Number(fromIndex), 1);
                parentVal.splice(Number(toIndex), 0, removed);
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

function isPrimitive(v: unknown): v is string | number | boolean {
    return (
        typeof v === "string" || typeof v === "number" || typeof v === "boolean"
    );
}

export const parseOrmInitialObject = (obj: any): any => {
    // Regular arrays become sets.
    if (Array.isArray(obj)) {
        return new Set(obj.map(parseOrmInitialObject));
    } else if (obj && typeof obj === "object") {
        if ("@id" in obj) {
            // Regular object.
            for (const key of Object.keys(obj)) {
                obj[key] = parseOrmInitialObject(obj[key]);
            }
        } else {
            // Object does not have @id, that means it's a set of objects.
            return new Set(Object.values(obj).map(parseOrmInitialObject));
        }
    }
    return obj;
};
