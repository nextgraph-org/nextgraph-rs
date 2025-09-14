import type { DatasetChanges } from "@ldo/rdf-utils";
import type { BaseQuad } from "@rdfjs/types";

/**
 * Merges a new change into an original change
 * @param originalChange
 * @param newChange
 */
export function mergeDatasetChanges<InAndOutQuad extends BaseQuad>(
  originalChange: DatasetChanges<InAndOutQuad>,
  newChange: DatasetChanges<InAndOutQuad>,
): void {
  // Add added
  if (newChange.added) {
    if (originalChange.added) {
      originalChange.added.addAll(newChange.added);
    } else {
      originalChange.added = newChange.added;
    }
    // Delete from removed if present
    const changesIntersection = originalChange.removed?.intersection(
      newChange.added,
    );
    if (changesIntersection && changesIntersection.size > 0) {
      originalChange.removed =
        originalChange.removed?.difference(changesIntersection);
    }
  }
  // Add removed
  if (newChange.removed) {
    if (originalChange.removed) {
      originalChange.removed.addAll(newChange.removed);
    } else {
      originalChange.removed = newChange.removed;
    }
    // Delete from added if present
    const changesIntersection = originalChange.added?.intersection(
      newChange.removed,
    );
    if (changesIntersection && changesIntersection.size > 0) {
      originalChange.added =
        originalChange.added?.difference(changesIntersection);
    }
  }

  // Make undefined if size is zero
  if (originalChange.added && originalChange.added.size === 0) {
    originalChange.added = undefined;
  }
  if (originalChange.removed && originalChange.removed.size === 0) {
    originalChange.removed = undefined;
  }
}
