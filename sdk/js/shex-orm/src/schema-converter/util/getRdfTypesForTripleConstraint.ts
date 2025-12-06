// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type {
    ShexJTraverserTypes,
    tripleExprOrRef,
} from "@ldo/traverser-shexj";
import type { InterfaceInstanceNode } from "@ldo/type-traverser";

function addRdfTypeFromTripleExpr(
    tripleExpr: tripleExprOrRef,
    rdfTypeSet: Set<string>
) {
    if (
        typeof tripleExpr === "object" &&
        tripleExpr.type === "TripleConstraint" &&
        tripleExpr.predicate ===
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" &&
        typeof tripleExpr.valueExpr === "object" &&
        tripleExpr.valueExpr.type === "NodeConstraint" &&
        tripleExpr.valueExpr.values
    ) {
        tripleExpr.valueExpr.values.forEach((val) => {
            if (typeof val === "string") rdfTypeSet.add(val);
            // TODO handle other edge cases like IRIStem
        });
    }
}

function recursivelyGatherTypesFromShapeNodes(
    shapeNode: InterfaceInstanceNode<
        ShexJTraverserTypes,
        "Shape",
        ShexJTraverserTypes["Shape"]
    >,
    rdfTypeSet: Set<string>
): void {
    const tripleExpr = shapeNode.instance.expression;
    if (tripleExpr) addRdfTypeFromTripleExpr(tripleExpr, rdfTypeSet);

    shapeNode.parent("shapeExpr").forEach((parentShapeExpr) => {
        parentShapeExpr
            .parent("ShapeDecl", "shapeExpr")
            .forEach((parentShapeDecl) => {
                parentShapeDecl
                    .parent("shapeDeclRef")
                    .forEach((parentShapeDeclOrRef) => {
                        parentShapeDeclOrRef
                            .parent("shapeExprOrRef")
                            .forEach((parentShapeExprOrRef) => {
                                parentShapeExprOrRef
                                    .parent("Shape", "extends")
                                    .forEach((parentShape) => {
                                        recursivelyGatherTypesFromShapeNodes(
                                            parentShape,
                                            rdfTypeSet
                                        );
                                        const childExpressionNode =
                                            parentShape.child("expression");
                                        if (!childExpressionNode) return;
                                        const childEachOf = childExpressionNode
                                            .child()
                                            .child();
                                        if (childEachOf.typeName === "EachOf") {
                                            recursivelyGatherTypesFromEachOfNodes(
                                                childEachOf,
                                                rdfTypeSet
                                            );
                                        }
                                    });
                            });
                    });
            });
    });
}

function recursivelyGatherTypesFromEachOfNodes(
    eachOfNode: InterfaceInstanceNode<
        ShexJTraverserTypes,
        "EachOf",
        ShexJTraverserTypes["EachOf"]
    >,
    rdfTypeSet: Set<string>
): void {
    const tripleExprs = eachOfNode.instance.expressions;
    tripleExprs.forEach((tripleExpr) => {
        addRdfTypeFromTripleExpr(tripleExpr, rdfTypeSet);
    });

    eachOfNode.parent("tripleExpr").forEach((tripleExprNode) => {
        const tripleExprOrRefNodes = tripleExprNode.parent("tripleExprOrRef");
        tripleExprOrRefNodes.forEach((tripleExprOrRdfNode) => {
            const parentEachOfs = tripleExprOrRdfNode.parent(
                "EachOf",
                "expressions"
            );
            parentEachOfs.forEach((parentEachOf) => {
                recursivelyGatherTypesFromEachOfNodes(parentEachOf, rdfTypeSet);
            });
            // Deal with shape extends
            const parentShapes = tripleExprOrRdfNode.parent(
                "Shape",
                "expression"
            );
            parentShapes.forEach((parentShape) =>
                recursivelyGatherTypesFromShapeNodes(parentShape, rdfTypeSet)
            );
        });
    });
}

export function getRdfTypesForTripleConstraint(
    tripleConstraintNode: InterfaceInstanceNode<
        ShexJTraverserTypes,
        "TripleConstraint",
        ShexJTraverserTypes["TripleConstraint"]
    >
): string[] | undefined[] {
    // Check that there's a triple constraint that is a type at the
    // same level if there is, use that as an rdfType
    const rdfTypeSet = new Set<string>();
    tripleConstraintNode.parent("tripleExpr").forEach((tripleExprParents) => {
        tripleExprParents
            .parent("tripleExprOrRef")
            .forEach((tripleExprOrRefParent) => {
                tripleExprOrRefParent
                    .parent("EachOf", "expressions")
                    .forEach((eachOfParent) => {
                        recursivelyGatherTypesFromEachOfNodes(
                            eachOfParent,
                            rdfTypeSet
                        );
                    });
                tripleExprOrRefParent
                    .parent("Shape", "expression")
                    .forEach((shapeParent) => {
                        recursivelyGatherTypesFromShapeNodes(
                            shapeParent,
                            rdfTypeSet
                        );
                    });
            });
    });
    const rdfTypes = rdfTypeSet.size > 0 ? Array.from(rdfTypeSet) : [undefined];
    return rdfTypes;
}
