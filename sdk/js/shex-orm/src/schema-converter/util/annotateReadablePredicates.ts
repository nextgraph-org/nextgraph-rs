import type { Schema, ShapeDecl, Shape, EachOf, TripleConstraint } from "shexj";

// Split IRI by colon, slash and hash; drop empties
const splitIriTokens = (iri: string): string[] =>
    iri.split(/[:/#]+/).filter(Boolean);
// Keep dots and dashes (so 0.1 stays as 0.1) but sanitize everything else
const sanitize = (s: string) => s.replace(/[^\w.\-]/g, "_");

type TCwReadable = TripleConstraint & { readablePredicate?: string };

/**
 * Annotate EachOf-level TripleConstraints with a collision-free readablePredicate.
 * Rule: for any group that shares the same local token, rename all members using
 * prefix-first `${prefix}_${local}` from right to left; fallback to composite.
 */
export default function annotateReadablePredicates(schema: Schema): void {
    const shapes = schema.shapes ?? [];

    const annotateEachOf = (eachOf: EachOf): void => {
        if (
            !eachOf ||
            eachOf.type !== "EachOf" ||
            !Array.isArray(eachOf.expressions)
        )
            return;

        const tcs = (eachOf.expressions as unknown[]).filter(
            (e): e is TCwReadable =>
                typeof e === "object" &&
                e !== null &&
                (e as any).type === "TripleConstraint"
        );

        if (tcs.length > 0) {
            // Group by local token (last segment of IRI) and set a base readablePredicate for all
            const readableNameToPredicatesMap = new Map<
                string,
                TCwReadable[]
            >();
            for (const tripleConstraint of tcs) {
                // Use the name based on the IRI ending.
                let readableName: string;
                // Special case rdfs:type => @type
                if (
                    tripleConstraint.predicate ===
                    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
                ) {
                    readableName = "@type";
                } else {
                    const tokens = splitIriTokens(tripleConstraint.predicate);
                    readableName = tokens.length
                        ? tokens[tokens.length - 1]
                        : tripleConstraint.predicate;
                }
                // default base name for non-colliders
                tripleConstraint.readablePredicate = readableName;
                const groupMembers =
                    readableNameToPredicatesMap.get(readableName) ?? [];
                groupMembers.push(tripleConstraint);
                readableNameToPredicatesMap.set(readableName, groupMembers);
            }
            // Resolve each group (rename all in collisions)
            for (const [, groupMembers] of readableNameToPredicatesMap) {
                if (groupMembers.length <= 1) continue;
                const used = new Set<string>();
                const local =
                    splitIriTokens(groupMembers[0].predicate).slice(-1)[0] ??
                    "";
                for (const tc of groupMembers) {
                    const tokens = splitIriTokens(tc.predicate);
                    let localIdx = tokens.lastIndexOf(local);
                    if (localIdx === -1)
                        localIdx = Math.max(tokens.length - 1, 0);
                    let prefixIdx = localIdx - 1;
                    let assigned = false;
                    while (prefixIdx >= 0) {
                        const cand = `${sanitize(tokens[prefixIdx])}_${sanitize(
                            tokens[localIdx]
                        )}`;
                        if (!used.has(cand)) {
                            tc.readablePredicate = cand;
                            used.add(cand);
                            assigned = true;
                            break;
                        }
                        prefixIdx -= 1;
                    }
                    if (!assigned) {
                        const iriNoProto = tc.predicate.replace(
                            /^[a-z]+:\/\//i,
                            ""
                        );
                        const composite = sanitize(
                            iriNoProto
                                .split(/[:/#]+/)
                                .slice(0, -1)
                                .join("_") || "iri"
                        );
                        let cand = `${composite}_${sanitize(tokens[localIdx] || local)}`;
                        let n = 1;
                        while (used.has(cand)) cand = `${cand}_${n++}`;
                        tc.readablePredicate = cand;
                        used.add(cand);
                    }
                }
            }

            // Recurse into nested valueExpr shapes of each TC
            for (const tc of tcs) {
                const ve: any = (tc as any).valueExpr;
                if (ve && typeof ve === "object") {
                    const t = (ve as any).type;
                    if (t === "Shape" && (ve as any).expression)
                        annotateEachOf((ve as any).expression as EachOf);
                    else if (t === "EachOf") annotateEachOf(ve as EachOf);
                    else if (
                        t === "ShapeOr" &&
                        Array.isArray((ve as any).shapeExprs)
                    ) {
                        for (const sub of (ve as any).shapeExprs)
                            annotateFromExpr(sub);
                    } else if (
                        t === "ShapeAnd" &&
                        Array.isArray((ve as any).shapeExprs)
                    ) {
                        for (const sub of (ve as any).shapeExprs)
                            annotateFromExpr(sub);
                    }
                }
            }
        }

        // Also recurse into any inline sub-EachOf/Shape expressions found directly in expressions
        for (const ex of eachOf.expressions as any[]) {
            if (ex && typeof ex === "object") annotateFromExpr(ex);
        }
    };

    const annotateFromExpr = (expr: any): void => {
        if (!expr || typeof expr !== "object") return;
        const t = (expr as any).type;
        if (t === "Shape" && (expr as any).expression)
            annotateEachOf((expr as any).expression as EachOf);
        else if (t === "EachOf") annotateEachOf(expr as EachOf);
        else if (t === "ShapeOr" && Array.isArray((expr as any).shapeExprs)) {
            for (const sub of (expr as any).shapeExprs) annotateFromExpr(sub);
        } else if (
            t === "ShapeAnd" &&
            Array.isArray((expr as any).shapeExprs)
        ) {
            for (const sub of (expr as any).shapeExprs) annotateFromExpr(sub);
        } else if (t === "TripleConstraint") {
            const ve = (expr as any).valueExpr;
            if (ve && typeof ve === "object") annotateFromExpr(ve);
        }
    };

    for (const s of shapes) {
        const sd = s as ShapeDecl;
        const shape = (sd.shapeExpr || (sd as any)) as Shape | undefined;
        if (shape?.expression) annotateFromExpr(shape as any);
    }
}
