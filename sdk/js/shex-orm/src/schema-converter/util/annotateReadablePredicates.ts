// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { Schema, ShapeDecl, Shape, EachOf, TripleConstraint } from "shexj";

// Split IRI by colon, slash and hash; drop empties
const splitIriTokens = (iri: string): string[] =>
    iri.split(/[:/#.]+/).filter(Boolean);
// Keep dots and dashes (so 0.1 stays as 0.1) but sanitize everything else
const sanitize = (s: string) => s.replace(/[^\w.\-@]/g, "_");

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

        const tripleConstraints = (eachOf.expressions as unknown[]).filter(
            (e): e is TCwReadable =>
                typeof e === "object" &&
                e !== null &&
                (e as any).type === "TripleConstraint"
        );

        if (tripleConstraints.length > 0) {
            // Workflow:
            // Split IRIs into its parts
            // Use last part of IRI as predicate name
            // In case of collisions: Consider the n-th last part too (foaf_name, vcard_name), etc.
            // Build a tree structure to keep track of collisions

            interface TripleConstraintNameNode {
                leaf: { tc: TCwReadable; iriElements: string[] } | false;
                children: Record<string, TripleConstraintNameNode | undefined>;
            }

            // Add a triple constraint (tc) to parent tree node.
            // The tree branches on name collisions.
            const addToPreds = (
                depth: number,
                parent: TripleConstraintNameNode,
                iriElements: string[],
                tc: TCwReadable
            ) => {
                // Get the name of the next IRI part (e.g. the foaf from foaf_name).
                // It can be that we are out of bounds. In that case we use "".
                // That way the final name remains the same, unless we still collisions.
                // In that case, we enumerate.
                const key = iriElements[depth] ?? "";

                // Case no collision: Add triple constraint as leaf.
                if (!parent.children[key]) {
                    parent.children[key] = {
                        leaf: { tc, iriElements },
                        children: {},
                    };
                } else if (key === "") {
                    // Case out of bounds but not the only one
                    // Add a counter prefix
                    const node = parent.children[key];

                    if (node.leaf) {
                        // If this child has a leaf, that means it didn't have children before.
                        // Add a __counter prefix__ now.
                        node.children = {
                            ["0"]: {
                                leaf: node.leaf,
                                children: {},
                            },
                        };
                        // Remove moved leaf from old node.
                        node.leaf = false;
                    }

                    // Add counter to iriElements -> will be picked up by recursion call.
                    iriElements[depth + 1] = Object.keys(
                        node.children
                    ).length.toString();

                    addToPreds(depth + 1, node, iriElements, tc);
                } else {
                    // Case collision: create a new child

                    const node = parent.children[key];

                    if (node.leaf) {
                        // If this child has a leaf, that means it didn't have children before.
                        // Move the leaf to the new children.
                        const childKey = node.leaf.iriElements[depth + 1] ?? "";
                        node.children = {
                            [childKey]: {
                                leaf: node.leaf,
                                children: {},
                            },
                        };
                        // Remove moved leaf from old node.
                        node.leaf = false;
                    }

                    addToPreds(depth + 1, node, iriElements, tc);
                }
            };

            // Root structure to keep names for triple constraints.
            // Keys are the readable names of the predicates
            const rootPredTree: TripleConstraintNameNode = {
                leaf: false,
                children: {},
            };

            // Add all triple constraints to root tree.
            for (const tripleConstraint of tripleConstraints) {
                const iri = tripleConstraint.predicate;

                if (iri === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    // Special case: convert type predicate to @type
                    addToPreds(0, rootPredTree, ["@type"], tripleConstraint);
                } else {
                    addToPreds(
                        0,
                        rootPredTree,
                        // Divide IRI in sanitized parts, start from end (property name)
                        splitIriTokens(iri).map(sanitize).reverse(),
                        tripleConstraint
                    );
                }
            }

            // Traverse tree and annotate
            const annotatePreds = (
                parentTree: TripleConstraintNameNode,
                accumulatedName: string
            ) => {
                // If we reached the leaf, annotate with name
                if (parentTree?.leaf) {
                    parentTree.leaf.tc.readablePredicate = accumulatedName;
                    return;
                }

                // Recurse for all children.
                for (const key of Object.keys(parentTree.children ?? {})) {
                    const name =
                        accumulatedName === ""
                            ? key // Just use name
                            : `${key}_${accumulatedName}`; // Make composite.

                    // Annotate children
                    annotatePreds(parentTree.children[key]!, name);
                }
            };

            annotatePreds(rootPredTree, "");

            // Recurse into nested valueExpr shapes of each TC
            for (const tc of tripleConstraints) {
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
