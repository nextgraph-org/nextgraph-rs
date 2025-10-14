import type { Schema } from "shexj";
/**
 * Annotate EachOf-level TripleConstraints with a collision-free readablePredicate.
 * Rule: for any group that shares the same local token, rename all members using
 * prefix-first `${prefix}_${local}` from right to left; fallback to composite.
 */
export default function annotateReadablePredicates(schema: Schema): void;
//# sourceMappingURL=annotateReadablePredicates.d.ts.map