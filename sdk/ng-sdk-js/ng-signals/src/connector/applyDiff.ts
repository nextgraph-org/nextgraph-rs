import { batch } from "ng-alien-deepsignals";

export type Patch = {
  /** Property path (array indices, object keys, synthetic Set entry ids) from the root to the mutated location. */
  path: string;
  type?: string & {};
  value?: unknown;
} & (
  | SetAddPatch
  | SetRemovePatch
  | ObjectAddPatch
  | RemovePatch
  | LiteralAddPatch
);

export interface SetAddPatch {
  /** Mutation kind applied at the resolved `path`. */
  op: "add";
  type: "set";
  /**
   * New value for set mutations:
   *  - A single primitive
   *  - An array of primitives
   *  - An object (id -> object) for object "set" additions
   */
  value:
    | number
    | string
    | boolean
    | (number | string | boolean)[]
    | { [id: string]: object };
}

export interface SetRemovePatch {
  /** Mutation kind applied at the resolved `path`. */
  op: "remove";
  type: "set";
  /**
   * The value(s) to be removed from the set. Either:
   *  - A single primitive / id
   *  - An array of primitives / ids
   */
  value: number | string | boolean | (number | string | boolean)[];
}

export interface ObjectAddPatch {
  /** Mutation kind applied at the resolved `path`. */
  op: "add";
  type: "object";
}

export interface RemovePatch {
  /** Mutation kind applied at the resolved `path`. */
  op: "remove";
}

export interface LiteralAddPatch {
  /** Mutation kind applied at the resolved `path`. */
  op: "add";
  /** The literal value to be added at the resolved `path` */
  value: string | number | boolean;
}

function isPrimitive(v: unknown): v is string | number | boolean {
  return (
    typeof v === "string" || typeof v === "number" || typeof v === "boolean"
  );
}

/**
 * Apply a diff to an object.
 *
 *  * The syntax is inspired by RFC 6902 but it is not compatible.
 *
 * It supports sets:
 *   - Primitive values are added as sets,
 *   - Sets of objects are represented as objects with their id being the key.
 * @example operations
 *   ```jsonc
 *     // Add one or more objects to a set.
 *     { "op": "add", "type": "set", "path": "/address", "value": { "ID1": {...}, "ID2": {...} } },
 *     // Remove one or more objects from a set.
 *     { "op": "remove", "type": "set", "path": "/address", "value": ["ID1","ID2"] }
 *     // Add primitive types to a sets (URIs are treated just like strings)
 *     { "op": "add", "type": "set", "path": "/address", "value": [1,2,3] }
 *     // Remove primitive types from a set.
 *     { "op": "remove", "type": "set", "path": "/address", "value": [1,2] }
 *
 *     // Creating an object.
 *     { "op": "add", "path": "/address", "type": "object" }
 *     // Adding primitives.
 *     { "op": "add", "path": "/address/street", value: "1st street" }
 *     { "op": "add", "path": "/address/country", value: "Greece" }
 *     // Remove a primitive.
 *     { "op": "remove", "path": "/address/street" }
 *     // Remove an object
 *     { "op": "remove", "path": "/address" }
 * ```
 *
 * @param currentState The object before the patch
 * @param diff An array of patches to apply to the object.
 * @param ensurePathExists If true, create nested objects along the path if the path does not exist.
 */
export function applyDiff(
  currentState: Record<string, any>,
  diff: Patch[],
  ensurePathExists: boolean = false
) {
  for (const patch of diff) {
    if (!patch.path.startsWith("/")) continue;
    const pathParts = patch.path.slice(1).split("/").filter(Boolean);

    if (pathParts.length === 0) continue; // root not supported
    const lastKey = pathParts[pathParts.length - 1];
    let parentVal: any = currentState;
    let parentMissing = false;
    // Traverse only intermediate segments
    for (let i = 0; i < pathParts.length - 1; i++) {
      const seg = pathParts[i];
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
        `[applyDiff] Skipping patch due to missing parent path segment(s): ${patch.path}`
      );
      continue;
    }

    // parentVal now should be an object into which we apply lastKey
    if (parentVal == null || typeof parentVal !== "object") {
      console.warn(
        `[applyDiff] Skipping patch because parent is not an object: ${patch.path}`
      );
      continue;
    }
    const key = lastKey;
    // If parent does not exist and we cannot create it, skip this patch
    if (parentVal == null || typeof parentVal !== "object") continue;

    // Handle set additions
    if (patch.op === "add" && patch.type === "set") {
      const existing = parentVal[key];

      // Normalize value
      const raw = (patch as SetAddPatch).value;
      if (raw == null) continue;

      // Object-set (id -> object)
      if (typeof raw === "object" && !Array.isArray(raw) && !isPrimitive(raw)) {
        if (existing && (existing instanceof Set || Array.isArray(existing))) {
          // Replace incompatible representation
          parentVal[key] = {};
        }
        if (!parentVal[key] || typeof parentVal[key] !== "object") {
          parentVal[key] = {};
        }
        Object.assign(parentVal[key], raw);
        continue;
      }

      // Set primitive(s)
      const toAdd: (string | number | boolean)[] = Array.isArray(raw)
        ? raw.filter(isPrimitive)
        : isPrimitive(raw)
        ? [raw]
        : [];

      if (!toAdd.length) continue;

      if (existing instanceof Set) {
        for (const v of toAdd) existing.add(v);
      } else if (
        existing &&
        typeof existing === "object" &&
        !Array.isArray(existing) &&
        !(existing instanceof Set)
      ) {
        // Existing is object-set (objects); adding primitives -> replace with Set
        parentVal[key] = new Set(toAdd);
      } else {
        // No existing or incompatible -> create a Set
        parentVal[key] = new Set(toAdd);
      }
      continue;
    }

    // Handle set removals
    if (patch.op === "remove" && patch.type === "set") {
      const existing = parentVal[key];
      const raw = (patch as SetRemovePatch).value;
      if (raw == null) continue;
      const toRemove: (string | number | boolean)[] = Array.isArray(raw)
        ? raw
        : [raw];

      if (existing instanceof Set) {
        for (const v of toRemove) existing.delete(v);
      } else if (existing && typeof existing === "object") {
        for (const v of toRemove) delete existing[v as any];
      }
      continue;
    }

    // Add object (ensure object exists)
    if (patch.op === "add" && patch.type === "object") {
      const cur = parentVal[key];
      if (
        cur === undefined ||
        cur === null ||
        typeof cur !== "object" ||
        cur instanceof Set
      ) {
        parentVal[key] = {};
      }
      continue;
    }

    // Literal add
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
 * See documentation for applyDiff
 */
export function applyDiffToDeepSignal(currentState: object, diff: Patch[]) {
  batch(() => {
    applyDiff(currentState as Record<string, any>, diff);
  });
}
