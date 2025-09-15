import ShexJTraverser from "@ldo/traverser-shexj";
import { SchemaProperty, SchemaValue, Shape } from "../../types.ts";
import { ObjectLiteral } from "../../ShexJTypes.ts";

export const ShexJSchemaTransformerCompact = ShexJTraverser.createTransformer<
    {
        Schema: { return: Shape[] };
        ShapeDecl: { return: Shape };
        Shape: { return: Shape };
        EachOf: { return: Shape };
        TripleConstraint: { return: SchemaProperty };
        NodeConstraint: { return: SchemaValue };
        ShapeOr: { return: (SchemaValue | Shape | string)[] };
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
                    (p) => p.predicateUri === extra
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
                    (expr) => expr as SchemaProperty
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
                predicateUri: tripleConstraint.predicate,
                // @ts-expect-error The ldo library does not have our modded readablePredicate property.
                readablePredicate: tripleConstraint.readablePredicate,
            };
            // Make property based on object type which is either a parsed schema, literal or type.
            if (typeof transformedChildren.valueExpr === "string") {
                // Reference to nested object
                return {
                    type: "nested",
                    nestedSchema: transformedChildren.valueExpr,
                    ...commonProperties,
                } satisfies SchemaProperty;
            } else if (
                transformedChildren.valueExpr &&
                (transformedChildren.valueExpr as Shape).predicates
            ) {
                // Nested object
                return {
                    type: "nested",
                    nestedSchema: transformedChildren.valueExpr as Shape,
                    ...commonProperties,
                } satisfies SchemaProperty;
            } else if (Array.isArray(transformedChildren.valueExpr)) {
                return {
                    type: "eitherOf",
                    eitherOf: transformedChildren.valueExpr,
                    ...commonProperties,
                };
            } else {
                // type or literal
                const nodeConstraint =
                    transformedChildren.valueExpr as SchemaValue;
                return {
                    type: nodeConstraint.type,
                    literalValue: nodeConstraint.literals,
                    ...commonProperties,
                } satisfies SchemaProperty;
            }
        },
    },

    NodeConstraint: {
        transformer: async (nodeConstraint) => {
            if (nodeConstraint.datatype) {
                switch (nodeConstraint.datatype) {
                    case "http://www.w3.org/2001/XMLSchema#boolean":
                        return { type: "boolean" };
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
                        return { type: "number" };
                    default:
                        return { type: "string" }; // treat most as string
                }
            }
            if (nodeConstraint.nodeKind) {
                // Something reference-like.
                return { type: "string" };
            }
            if (nodeConstraint.values) {
                return {
                    type: "literal",
                    literals: nodeConstraint.values.map(
                        // TODO: We do not convert them to number or boolean or lang tag.
                        (valueRecord) => (valueRecord as ObjectLiteral).value
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
            const tc = await getTransformedChildren();
            // Either a shape IRI, a nested shape or a node CompactSchemaValue (node constraint).
            return (Array.isArray(tc) ? tc : [tc]) as (
                | string
                | Shape
                | SchemaValue
            )[];
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
