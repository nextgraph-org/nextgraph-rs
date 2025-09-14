import type { ObjectLiteral } from "@ldo/traverser-shexj";
import ShexJTraverser from "@ldo/traverser-shexj";

export interface CompactShape {
  iri: string;
  predicates: CompactSchemaProperty[];
}

type CompactSchemaValue = {
  literals?: number[] | string[] | boolean;
  type: "number" | "string" | "boolean" | "literal";
};

interface CompactSchemaProperty {
  /** Type of property. */
  type: "number" | "string" | "boolean" | "literal" | "nested" | "eitherOf";
  /** The RDF predicate URI. */
  predicateUri: string;
  /** The alias of the `predicateUri` when serialized to a JSON object. */
  readablePredicate: string;
  /** The required literal value(s), if type is `literal`. Others are allowed, if `extra` is true. */
  literalValue?: number | string | boolean | number[] | string[];
  /** If type is `nested`, the shape or its IRI.  */
  nestedSchema?: string | CompactShape;
  /** Maximum allowed number of values. `-1` means infinite. */
  maxCardinality: number;
  /** Minimum required number of values */
  minCardinality: number;
  /** If type is `eitherOf`, specifies multiple allowed types (CompactSchemaValue, shapes, or shape IRI). */
  eitherOf?: (CompactSchemaValue | CompactShape | string)[];
  /** If other (additional) values are permitted. Useful for literals. */
  extra?: boolean;
}

export const ShexJSchemaTransformerCompact = ShexJTraverser.createTransformer<
  {
    Schema: { return: CompactShape[] };
    ShapeDecl: { return: CompactShape };
    Shape: { return: CompactShape };
    EachOf: { return: CompactShape };
    TripleConstraint: { return: CompactSchemaProperty };
    NodeConstraint: { return: CompactSchemaValue };
    ShapeOr: { return: (CompactSchemaValue | CompactShape | string)[] };
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
      const shape = schema.shapeExpr as CompactShape;

      return { ...shape, iri: shapeDecl.id } as CompactShape;
    },
  },

  Shape: {
    transformer: async (_shape, getTransformedChildren) => {
      // TODO: We don't handles those
      _shape.closed;

      const transformedChildren = await getTransformedChildren();
      const compactShape = transformedChildren.expression as CompactShape;

      for (const extra of _shape.extra || []) {
        const extraPredicate = compactShape.predicates.find(
          (p) => p.predicateUri === extra,
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
          (expr) => expr as CompactSchemaProperty,
        ),
      };
    },
  },

  TripleConstraint: {
    transformer: async (
      tripleConstraint,
      getTransformedChildren,
      _setReturnPointer,
    ) => {
      const transformedChildren = await getTransformedChildren();

      const commonProperties = {
        maxCardinality: tripleConstraint.max ?? 1,
        minCardinality: tripleConstraint.min ?? 1,
        predicateUri: tripleConstraint.predicate,
        readablePredicate: tripleConstraint.readablePredicate,
      };
      // Make property based on object type which is either a parsed schema, literal or type.
      if (typeof transformedChildren.valueExpr === "string") {
        // Reference to nested object
        return {
          type: "nested",
          nestedSchema: transformedChildren.valueExpr,
          ...commonProperties,
        } satisfies CompactSchemaProperty;
      } else if (
        transformedChildren.valueExpr &&
        (transformedChildren.valueExpr as CompactShape).predicates
      ) {
        // Nested object
        return {
          type: "nested",
          nestedSchema: transformedChildren.valueExpr as CompactShape,
          ...commonProperties,
        } satisfies CompactSchemaProperty;
      } else if (Array.isArray(transformedChildren.valueExpr)) {
        return {
          type: "eitherOf",
          eitherOf: transformedChildren.valueExpr,
          ...commonProperties,
        };
      } else {
        // type or literal
        const nodeConstraint =
          transformedChildren.valueExpr as CompactSchemaValue;
        return {
          type: nodeConstraint.type,
          literalValue: nodeConstraint.literals,
          ...commonProperties,
        } satisfies CompactSchemaProperty;
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
            (valueRecord) => (valueRecord as ObjectLiteral).value,
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
        | CompactShape
        | CompactSchemaValue
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
