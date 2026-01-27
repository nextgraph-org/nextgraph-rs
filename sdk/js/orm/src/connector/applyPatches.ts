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

export type Patch = {
    /** Property path (array indices, object keys, synthetic Set entry ids) from the root to the mutated location. */
    path: string;
    valType?: string & {};
    value?: unknown;
} & (SetAddPatch | SetRemovePatch | RemovePatch | LiteralAddPatch);

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

export interface RemovePatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "remove";
}

export interface LiteralAddPatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "add";
    /** The literal value to be added at the resolved `path` */
    value: string | number | boolean | object;
}

function isPrimitive(v: unknown): v is string | number | boolean {
    return (
        typeof v === "string" || typeof v === "number" || typeof v === "boolean"
    );
}

/**
 * Parse a combined identifier of the form "graph|subject".
 * If there is no pipe, returns { graph: undefined, id: input }.
 */
function parseGraphId(input: string): { graph?: string; id: string } {
    if (typeof input !== "string") return { id: String(input) } as any;
    const idx = input.indexOf("|");
    if (idx === -1) return { id: input };
    const graph = input.slice(0, idx);
    const id = input.slice(idx + 1);
    return { graph, id };
}

/**
 * Find an object in a Set by its @id property.
 * Returns the object if found, otherwise undefined.
 */
function findInSetBySegment(set: Set<any>, seg: string): any | undefined {
    // TODO: We could optimize that by leveraging key @id to object mapping in sets of deepSignals.

    const { graph, id } = parseGraphId(seg);

    for (const item of set) {
        if (typeof item !== "object" || item === null) continue;
        // If graph was provided, require both to match
        if (graph && item["@graph"] === graph && item["@id"] === id)
            return item;
        // Match by @id only when no graph part is provided
        if (!graph && item["@id"] === id) return item;
    }
    return undefined;
}

/**
 * Apply a diff to an object.
 *
 * The syntax is inspired by RFC 6902 but it is not compatible.
 *
 * It supports Sets for multi-valued properties:
 *   - Primitive values are added as Sets (Set<string | number | boolean>)
 *   - Multi-valued objects are stored in Sets, accessed by their @id property
 *   - Single objects are plain objects with an @id property
 *
 * Path traversal:
 *   - When traversing through a Set, the path segment is treated as an @id to find the object
 *   - When traversing through a plain object, the path segment is a property name
 *
 * @example operations
 *   ```jsonc
 *     // === SINGLE OBJECT ===
 *     // Creating a single object (has @id at same level)
 *     { "op": "add", "path": "/urn:example:person1/address", "valType": "object" }
 *     { "op": "add", "path": "/urn:example:person1/address/@id", "value": "urn:test:address1" }
 *     // Adding primitives to single object
 *     { "op": "add", "path": "/urn:example:person1/address/street", "value": "1st street" }
 *     { "op": "add", "path": "/urn:example:person1/address/country", "value": "Greece" }
 *     // Remove a primitive from object
 *     { "op": "remove", "path": "/urn:example:person1/address/street" }
 *     // Remove the entire object
 *     { "op": "remove", "path": "/urn:example:person1/address" }
 *
 *     // === MULTI-VALUED OBJECTS (Set) ===
 *     // Creating a multi-object container (NO @id at this level -> creates Set)
 *     { "op": "add", "path": "/urn:example:person1/children", "valType": "object" }
 *     // Adding an object to the Set (path includes object's @id)
 *     { "op": "add", "path": "/urn:example:person1/children/urn:example:child1", "valType": "object" }
 *     { "op": "add", "path": "/urn:example:person1/children/urn:example:child1/@id", "value": "urn:example:child1" }
 *     // Adding properties to object in Set
 *     { "op": "add", "path": "/urn:example:person1/children/urn:example:child1/name", "value": "Alice" }
 *     // Remove an object from Set
 *     { "op": "remove", "path": "/urn:example:person1/children/urn:example:child1" }
 *     // Remove all objects (the Set itself)
 *     { "op": "remove", "path": "/urn:example:person1/children" }
 *
 *     // === PRIMITIVE SETS ===
 *     // Add primitive types to Sets
 *     { "op": "add", "valType": "set", "path": "/urn:example:person1/tags", "value": [1,2,3] }
 *     // Remove primitive types from a Set
 *     { "op": "remove", "valType": "set", "path": "/urn:example:person1/tags", "value": [1,2] }
 * ```
 *
 * @param currentState The object before the patch
 * @param patches An array of patches to apply to the object.
 * @param ensurePathExists If true, create nested objects along the path if the path does not exist.
 *
 * @note When creating new objects, this function pre-scans upcoming patches to find @id and @graph
 *       values that will be assigned to the object. This prevents the signal library's propGenerator
 *       from being triggered before these identity fields are set, which would cause it to generate
 *       random IDs unnecessarily.
 */
export function applyPatches(
    currentState: Record<string, any>,
    patches: Patch[],
    ormType: "set" | "discrete",
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
            // Handle Sets: if parentVal is a Set, find object by path segment.
            if (parentVal instanceof Set) {
                const foundObj = findInSetBySegment(parentVal, seg);
                if (foundObj) {
                    parentVal = foundObj;
                } else if (ensurePathExists) {
                    // Create new object in the set.
                    const newObj = {};
                    parentVal.add(newObj);
                    parentVal = newObj;
                } else {
                    parentMissing = true;
                    break;
                }
                continue;
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
            if (ensurePathExists) {
                if (parentVal != null && typeof parentVal === "object") {
                    // Check if we need to create an object or a set:
                    if (pathParts[i + 1]?.includes("|") && ormType === "set") {
                        // The next path segment is an IRI, that means the new element must be a set of objects. Create a set.
                        parentVal[seg] = new Set();
                    } else {
                        // Create a new object
                        parentVal[seg] = {};
                    }
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

        // parentVal now should be an object, array, or set into which we apply lastKey
        if (parentVal == null || typeof parentVal !== "object") {
            console.warn(
                `[applyPatches] Skipping patch because parent is not an object or Set: ${patch.path}`
            );
            continue;
        }
        const key = lastKey;

        // Special handling when parent is a Set
        if (parentVal instanceof Set) {
            // The key represents the identifier of an object within the Set
            const targetObj = findInSetBySegment(parentVal, key);

            // Handle object creation in a Set
            if (
                patch.op === "add" &&
                typeof patch.value === "object" &&
                patch.value !== null
            ) {
                if (!targetObj) {
                    // Determine if this will be a single object or nested Set
                    const hasId = patches[patchIndex + 2]?.path.endsWith("@id");
                    const newLeaf: any = hasId ? {} : new Set();
                    // Pre-assign identity so subsequent patches can find this object
                    if (hasId) {
                        const { graph, id } = parseGraphId(key);
                        newLeaf["@id"] = id;
                        const graphPatch = patches[patchIndex + 1];
                        if (graphPatch?.path.endsWith("@graph")) {
                            newLeaf["@graph"] = graphPatch.value ?? graph;
                        } else if (graph) {
                            newLeaf["@graph"] = graph;
                        }
                    }
                    parentVal.add(newLeaf);

                    // Skip the next two add (@id + @graph) patches.
                    patchIndex += 2;
                }
                continue;
            }

            // Handle remove from Set
            if (patch.op === "remove" && patch.valType !== "set") {
                if (targetObj) {
                    parentVal.delete(targetObj);
                }
                continue;
            }

            // All other operations require the target object to exist
            if (!targetObj) {
                console.warn(
                    `[applyPatches] Target object with @id=${key} not found in Set for path: ${patch.path}`
                );
                continue;
            }

            // This shouldn't happen - we handle all intermediate segments in the traversal loop
            console.warn(
                `[applyPatches] Unexpected: reached end of path with Set as parent: ${patch.path}`
            );
            continue;
        }

        // Handle primitive set additions
        if (patch.op === "add" && patch.valType === "set") {
            const existing = parentVal[key];
            const raw = (patch as SetAddPatch).value;
            if (raw == null) continue;

            // Normalize to array of primitives
            const toAdd: (string | number | boolean)[] = Array.isArray(raw)
                ? raw.filter(isPrimitive)
                : isPrimitive(raw)
                  ? [raw]
                  : [];

            if (!toAdd.length) continue;

            // Ensure we have a Set, create or add to existing
            if (existing instanceof Set) {
                for (const v of toAdd) existing.add(v);
            } else {
                // Create new Set (replaces any incompatible existing value)
                parentVal[key] = new Set(toAdd);
            }
            continue;
        }

        // Handle primitive set removals
        if (patch.op === "remove" && patch.valType === "set") {
            const existing = parentVal[key];
            const raw = (patch as SetRemovePatch).value;
            if (raw == null) continue;

            const toRemove: (string | number | boolean)[] = Array.isArray(raw)
                ? raw
                : [raw];

            if (existing instanceof Set) {
                for (const v of toRemove) existing.delete(v);
            }
            continue;
        }

        // Add object (if it does not exist yet).
        // Distinguish between single objects and multi-object containers:
        // - If an @id patch follows for this path, it's a single object -> create {}
        // - If no @id patch follows, it's a container for multi-valued objects -> create set.
        if (
            patch.op === "add" &&
            typeof patch.value === "object" &&
            patch.value !== null &&
            ormType === "set" // TODO: The backend should preferably add valType: "set" here (we don't need ormType then).
        ) {
            const leafVal = parentVal[key];
            const hasId = patches.at(patchIndex + 2)?.path.endsWith("@id");

            // If the leafVal does not exist and it should be a set, create.
            if (!hasId && !leafVal) {
                parentVal[key] = new Set();
            } else if (!(typeof leafVal === "object")) {
                // If the leave does not exist yet (as object), create it.
                const newLeaf: Record<string, any> = {};
                const graphPatch = patches.at(patchIndex + 1);
                if (graphPatch?.path.endsWith("@graph")) {
                    newLeaf["@graph"] = graphPatch.value;
                }
                const idPatch = patches.at(patchIndex + 2);
                if (idPatch?.path.endsWith("@id")) {
                    newLeaf["@id"] = idPatch.value;
                }
                parentVal[key] = newLeaf;

                // Skip the next two add (@id + @graph) patches.
                patchIndex += 2;
            }

            continue;
        }

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
 * See documentation for applyPatches
 */
export function applyPatchesToDeepSignal(
    currentState: object,
    patch: Patch[],
    ormType: "set" | "discrete"
) {
    batch(() => {
        applyPatches(
            currentState as Record<string, any>,
            patch,
            ormType,
            false
        );
    });
}

function decodePathSegment(segment: string): string {
    return segment.replace("~1", "/").replace("~0", "~");
}
