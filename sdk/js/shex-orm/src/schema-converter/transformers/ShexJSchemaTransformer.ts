// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import ShexJTraverser from "@ldo/traverser-shexj";
import type { Predicate, DataType, Shape } from "../../types.ts";
import type { ObjectLiteral } from "../../ShexJTypes.ts";

const rdfDataTypeToBasic = (dataType: string) => {
    switch (dataType) {
        case "http://www.w3.org/2001/XMLSchema#string":
        case "http://www.w3.org/2001/XMLSchema#ENTITIES":
        case "http://www.w3.org/2001/XMLSchema#ENTITY":
        case "http://www.w3.org/2001/XMLSchema#ID":
        case "http://www.w3.org/2001/XMLSchema#IDREF":
        case "http://www.w3.org/2001/XMLSchema#IDREFS":
        case "http://www.w3.org/2001/XMLSchema#language":
        case "http://www.w3.org/2001/XMLSchema#Name":
        case "http://www.w3.org/2001/XMLSchema#NCName":
        case "http://www.w3.org/2001/XMLSchema#NMTOKEN":
        case "http://www.w3.org/2001/XMLSchema#NMTOKENS":
        case "http://www.w3.org/2001/XMLSchema#normalizedString":
        case "http://www.w3.org/2001/XMLSchema#QName":
        case "http://www.w3.org/2001/XMLSchema#token":
            return "string";
        case "http://www.w3.org/2001/XMLSchema#date":
        case "http://www.w3.org/2001/XMLSchema#dateTime":
        case "http://www.w3.org/2001/XMLSchema#duration":
        case "http://www.w3.org/2001/XMLSchema#gDay":
        case "http://www.w3.org/2001/XMLSchema#gMonth":
        case "http://www.w3.org/2001/XMLSchema#gMonthDay":
        case "http://www.w3.org/2001/XMLSchema#gYear":
        case "http://www.w3.org/2001/XMLSchema#gYearMonth":
        case "http://www.w3.org/2001/XMLSchema#time":
            return "string";
        case "http://www.w3.org/2001/XMLSchema#byte":
        case "http://www.w3.org/2001/XMLSchema#decimal":
        case "http://www.w3.org/2001/XMLSchema#double":
        case "http://www.w3.org/2001/XMLSchema#float":
        case "http://www.w3.org/2001/XMLSchema#int":
        case "http://www.w3.org/2001/XMLSchema#integer":
        case "http://www.w3.org/2001/XMLSchema#long":
        case "http://www.w3.org/2001/XMLSchema#negativeInteger":
        case "http://www.w3.org/2001/XMLSchema#nonNegativeInteger":
        case "http://www.w3.org/2001/XMLSchema#nonPositiveInteger":
        case "http://www.w3.org/2001/XMLSchema#positiveInteger":
        case "http://www.w3.org/2001/XMLSchema#short":
        case "http://www.w3.org/2001/XMLSchema#unsignedLong":
        case "http://www.w3.org/2001/XMLSchema#unsignedInt":
        case "http://www.w3.org/2001/XMLSchema#unsignedShort":
        case "http://www.w3.org/2001/XMLSchema#unsignedByte":
            return "number";
        case "http://www.w3.org/2001/XMLSchema#boolean":
            return "boolean";
        case "http://www.w3.org/2001/XMLSchema#hexBinary":
            return "string";
        case "http://www.w3.org/2001/XMLSchema#anyURI":
            return "iri";
        default:
            return "string";
    }
};

export const ShexJSchemaTransformerCompact = ShexJTraverser.createTransformer<
    {
        Schema: { return: Shape[] };
        ShapeDecl: { return: Shape };
        Shape: { return: Shape };
        EachOf: { return: Shape };
        TripleConstraint: { return: Predicate };
        NodeConstraint: { return: DataType };
        ShapeOr: { return: DataType[] };
        ShapeAnd: { return: never };
        ShapeNot: { return: never };
        ShapeExternal: { return: never };
    },
    null
>({
    Schema: {
        transformer: async (_schema, getTransformedChildren) => {
            const transformedChildren = await getTransformedChildren();

            return transformedChildren.shapes || [];
        },
    },

    ShapeDecl: {
        transformer: async (shapeDecl, getTransformedChildren) => {
            const schema = await getTransformedChildren();
            const shape = schema.shapeExpr as Shape;

            return { ...shape, iri: shapeDecl.id } as Shape;
        },
    },

    Shape: {
        transformer: async (_shape, getTransformedChildren) => {
            // TODO: We don't handles those
            _shape.closed;

            const transformedChildren = await getTransformedChildren();
            const compactShape = transformedChildren.expression as Shape;

            for (const extra of _shape.extra || []) {
                const extraPredicate = compactShape.predicates.find(
                    (p) => p.iri === extra
                );
                if (extraPredicate) extraPredicate.extra = true;
            }

            return compactShape;
        },
    },

    // EachOf contains the `expressions` array of properties (TripleConstraint)
    EachOf: {
        transformer: async (eachOf, getTransformedChildren) => {
            const transformedChildren = await getTransformedChildren();

            return {
                iri: "",
                predicates: transformedChildren.expressions.map(
                    // We disregard cases where properties are referenced (strings)
                    // or where they consist of Unions or Intersections (not supported).
                    (expr) => expr as Predicate
                ),
            };
        },
    },

    TripleConstraint: {
        transformer: async (
            tripleConstraint,
            getTransformedChildren,
            _setReturnPointer
        ) => {
            const transformedChildren = await getTransformedChildren();

            const commonProperties = {
                maxCardinality: tripleConstraint.max ?? 1,
                minCardinality: tripleConstraint.min ?? 1,
                iri: tripleConstraint.predicate,
                // @ts-expect-error The ldo library does not have our modded readablePredicate property.
                readablePredicate: tripleConstraint.readablePredicate,
            } satisfies Partial<Predicate>;
            // Make property based on object type which is either a parsed schema, literal or type.
            if (typeof transformedChildren.valueExpr === "string") {
                // Reference to nested object
                return {
                    dataTypes: [
                        {
                            valType: "shape",
                            shape: transformedChildren.valueExpr,
                        },
                    ],
                    ...commonProperties,
                };
            } else if (
                transformedChildren.valueExpr &&
                (transformedChildren.valueExpr as Shape).predicates
            ) {
                // Nested object
                return {
                    dataTypes: [
                        {
                            valType: "shape",
                            shape: transformedChildren.valueExpr as Shape,
                        },
                    ],
                    ...commonProperties,
                };
            } else if (Array.isArray(transformedChildren.valueExpr)) {
                return {
                    dataTypes: transformedChildren.valueExpr, // DataType[]
                    ...commonProperties,
                };
            } else {
                // type or literal
                const nodeConstraint =
                    transformedChildren.valueExpr as DataType;

                return {
                    dataTypes: !Array.isArray(nodeConstraint.literals)
                        ? [
                              {
                                  valType: nodeConstraint.valType,
                                  literals: nodeConstraint.literals,
                              },
                          ]
                        : nodeConstraint.literals.map((lit) => ({
                              valType: nodeConstraint.valType,
                              literals: [lit],
                          })),
                    ...commonProperties,
                } as Predicate;
            }
        },
    },

    NodeConstraint: {
        transformer: async (nodeConstraint) => {
            if (nodeConstraint.datatype) {
                return {
                    valType: rdfDataTypeToBasic(nodeConstraint.datatype),
                };
            }
            if (nodeConstraint.nodeKind) {
                // Something reference-like.
                return { valType: "iri" };
            }
            if (nodeConstraint.values) {
                return {
                    valType: "literal",
                    literals: nodeConstraint.values.map(
                        // TODO: We do not convert them to number or boolean or lang tag.
                        // And we don't have an annotation of the literal's type.
                        (valueRecord) => {
                            // If valueRecord is a string (IRIREF), return it directly
                            if (typeof valueRecord === "string") {
                                return valueRecord;
                            }
                            // Handle ObjectLiteral (has .value property)
                            if ("value" in valueRecord) {
                                return valueRecord.value;
                            }
                            // Handle other types with .id property (if any)
                            if ("id" in valueRecord) {
                                return (valueRecord as any).id;
                            }
                            // Handle Language type (has .languageTag)
                            if ("languageTag" in valueRecord) {
                                return valueRecord.languageTag;
                            }
                            // Handle stem-based types (IriStem, LiteralStem, LanguageStem)
                            if ("stem" in valueRecord) {
                                return valueRecord.stem as string;
                            }
                            // Fallback - should not happen in well-formed ShEx
                            return undefined;
                        }
                    ),
                };
            }

            // Maybe we should throw instead...
            throw {
                error: new Error("Could not parse Node Constraint"),
                nodeConstraint,
            };
        },
    },

    // Transformer from ShapeOr
    ShapeOr: {
        transformer: async (shapeOr, getTransformedChildren) => {
            const { shapeExprs } = await getTransformedChildren();
            // Either a shape IRI, a nested shape or a node CompactSchemaValue (node constraint).
            return (
                Array.isArray(shapeExprs) ? shapeExprs : [shapeExprs]
            ) as DataType[];
        },
    },

    // Transformer from ShapeAnd
    ShapeAnd: {
        transformer: async () => {
            throw new Error("ShapeAnd not supported (compact)");
        },
    },

    // Transformer from ShapeNot - not supported.
    ShapeNot: {
        transformer: async () => {
            throw new Error("ShapeNot not supported (compact)");
        },
    },

    // Transformer from ShapeExternal - not supported.
    ShapeExternal: {
        transformer: async () => {
            throw new Error("ShapeExternal not supported (compact)");
        },
    },
});
