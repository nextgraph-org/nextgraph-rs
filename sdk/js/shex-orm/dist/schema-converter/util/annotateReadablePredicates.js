// Split IRI by colon, slash and hash; drop empties
const splitIriTokens = (iri) => iri.split(/[:/#]+/).filter(Boolean);
// Keep dots and dashes (so 0.1 stays as 0.1) but sanitize everything else
const sanitize = (s) => s.replace(/[^\w.\-]/g, "_");
/**
 * Annotate EachOf-level TripleConstraints with a collision-free readablePredicate.
 * Rule: for any group that shares the same local token, rename all members using
 * prefix-first `${prefix}_${local}` from right to left; fallback to composite.
 */
export default function annotateReadablePredicates(schema) {
    const shapes = schema.shapes ?? [];
    const annotateEachOf = (eachOf) => {
        if (!eachOf ||
            eachOf.type !== "EachOf" ||
            !Array.isArray(eachOf.expressions))
            return;
        const tcs = eachOf.expressions.filter((e) => typeof e === "object" &&
            e !== null &&
            e.type === "TripleConstraint");
        if (tcs.length > 0) {
            // Group by local token (last segment of IRI) and set a base readablePredicate for all
            const groups = new Map();
            for (const tc of tcs) {
                const tokens = splitIriTokens(tc.predicate);
                const local = tokens.length
                    ? tokens[tokens.length - 1]
                    : tc.predicate;
                // default base name for non-colliders
                tc.readablePredicate = local;
                const arr = groups.get(local) ?? [];
                arr.push(tc);
                groups.set(local, arr);
            }
            // Resolve each group (rename all in collisions)
            for (const [, arr] of groups) {
                if (arr.length <= 1)
                    continue;
                const used = new Set();
                const local = splitIriTokens(arr[0].predicate).slice(-1)[0] ?? "";
                for (const tc of arr) {
                    const tokens = splitIriTokens(tc.predicate);
                    let localIdx = tokens.lastIndexOf(local);
                    if (localIdx === -1)
                        localIdx = Math.max(tokens.length - 1, 0);
                    let prefixIdx = localIdx - 1;
                    let assigned = false;
                    while (prefixIdx >= 0) {
                        const cand = `${sanitize(tokens[prefixIdx])}_${sanitize(tokens[localIdx])}`;
                        if (!used.has(cand)) {
                            tc.readablePredicate = cand;
                            used.add(cand);
                            assigned = true;
                            break;
                        }
                        prefixIdx -= 1;
                    }
                    if (!assigned) {
                        const iriNoProto = tc.predicate.replace(/^[a-z]+:\/\//i, "");
                        const composite = sanitize(iriNoProto
                            .split(/[:/#]+/)
                            .slice(0, -1)
                            .join("_") || "iri");
                        let cand = `${composite}_${sanitize(tokens[localIdx] || local)}`;
                        let n = 1;
                        while (used.has(cand))
                            cand = `${cand}_${n++}`;
                        tc.readablePredicate = cand;
                        used.add(cand);
                    }
                }
            }
            // Recurse into nested valueExpr shapes of each TC
            for (const tc of tcs) {
                const ve = tc.valueExpr;
                if (ve && typeof ve === "object") {
                    const t = ve.type;
                    if (t === "Shape" && ve.expression)
                        annotateEachOf(ve.expression);
                    else if (t === "EachOf")
                        annotateEachOf(ve);
                    else if (t === "ShapeOr" &&
                        Array.isArray(ve.shapeExprs)) {
                        for (const sub of ve.shapeExprs)
                            annotateFromExpr(sub);
                    }
                    else if (t === "ShapeAnd" &&
                        Array.isArray(ve.shapeExprs)) {
                        for (const sub of ve.shapeExprs)
                            annotateFromExpr(sub);
                    }
                }
            }
        }
        // Also recurse into any inline sub-EachOf/Shape expressions found directly in expressions
        for (const ex of eachOf.expressions) {
            if (ex && typeof ex === "object")
                annotateFromExpr(ex);
        }
    };
    const annotateFromExpr = (expr) => {
        if (!expr || typeof expr !== "object")
            return;
        const t = expr.type;
        if (t === "Shape" && expr.expression)
            annotateEachOf(expr.expression);
        else if (t === "EachOf")
            annotateEachOf(expr);
        else if (t === "ShapeOr" && Array.isArray(expr.shapeExprs)) {
            for (const sub of expr.shapeExprs)
                annotateFromExpr(sub);
        }
        else if (t === "ShapeAnd" &&
            Array.isArray(expr.shapeExprs)) {
            for (const sub of expr.shapeExprs)
                annotateFromExpr(sub);
        }
        else if (t === "TripleConstraint") {
            const ve = expr.valueExpr;
            if (ve && typeof ve === "object")
                annotateFromExpr(ve);
        }
    };
    for (const s of shapes) {
        const sd = s;
        const shape = (sd.shapeExpr || sd);
        if (shape?.expression)
            annotateFromExpr(shape);
    }
}
