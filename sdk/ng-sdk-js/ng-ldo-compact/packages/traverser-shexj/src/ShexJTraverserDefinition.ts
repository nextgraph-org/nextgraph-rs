import type { ShexJTraverserTypes } from "./ShexJTraverserTypes.js";
import type { TraverserDefinitions } from "@ldo/type-traverser";
import type { shapeExpr, valueSetValue } from "./ShexJTypes.js";

export const ShexJTraverserDefinition: TraverserDefinitions<ShexJTraverserTypes> =
  {
    Schema: {
      kind: "interface",
      properties: {
        startActs: "SemAct",
        start: "shapeExprOrRef",
        imports: "IRIREF",
        shapes: "ShapeDecl",
      },
    },
    ShapeDecl: {
      kind: "interface",
      properties: {
        id: "shapeDeclLabel",
        abstract: "BOOL",
        restricts: "shapeExprOrRef",
        shapeExpr: "shapeExpr",
      },
    },
    shapeExpr: {
      kind: "union",
      selector: (item: shapeExpr) => item.type,
    },
    shapeExprOrRef: {
      kind: "union",
      selector: (item) =>
        typeof item === "string" || item.type === "ShapeDecl"
          ? "shapeDeclRef"
          : "shapeExpr",
    },
    ShapeOr: {
      kind: "interface",
      properties: {
        shapeExprs: "shapeExprOrRef",
      },
    },
    ShapeAnd: {
      kind: "interface",
      properties: {
        shapeExprs: "shapeExprOrRef",
      },
    },
    ShapeNot: {
      kind: "interface",
      properties: {
        shapeExpr: "shapeExprOrRef",
      },
    },
    ShapeExternal: {
      kind: "interface",
      properties: {},
    },
    shapeDeclRef: {
      kind: "union",
      selector: (value) =>
        typeof value === "string" ? "shapeDeclLabel" : "ShapeDecl",
    },
    shapeDeclLabel: {
      kind: "union",
      selector: () => "IRIREF",
    },
    NodeConstraint: {
      kind: "interface",
      properties: {
        datatype: "IRIREF",
        values: "valueSetValue",
        length: "INTEGER",
        minlength: "INTEGER",
        maxlength: "INTEGER",
        pattern: "STRING",
        flags: "STRING",
        mininclusive: "numericLiteral",
        minexclusive: "numericLiteral",
        totaldigits: "INTEGER",
        fractiondigits: "INTEGER",
        semActs: "SemAct",
        annotations: "Annotation",
      },
    },
    numericLiteral: {
      kind: "union",
      selector: () => "DOUBLE",
    },
    valueSetValue: {
      kind: "union",
      selector: (item: valueSetValue) => {
        if (typeof item === "string") {
          return "objectValue";
        } else if (
          item.type &&
          [
            "IriStem",
            "IriStemRange",
            "LiteralStem",
            "LiteralStemRange",
            "Language",
            "LanguageStem",
            "LanguageStemRange",
          ].includes(item.type)
        ) {
          return item.type as
            | "IriStem"
            | "IriStemRange"
            | "LiteralStem"
            | "LiteralStemRange"
            | "Language"
            | "LanguageStem"
            | "LanguageStemRange";
        } else {
          return "objectValue";
        }
      },
    },
    objectValue: {
      kind: "union",
      selector: (item) =>
        typeof item === "string" ? "IRIREF" : "ObjectLiteral",
    },
    ObjectLiteral: {
      kind: "interface",
      properties: {
        value: "STRING",
        language: "STRING",
        type: "STRING",
      },
    },
    IriStem: {
      kind: "interface",
      properties: {
        stem: "IRIREF",
      },
    },
    IriStemRange: {
      kind: "interface",
      properties: {
        stem: "IRIREF",
        exclusions: "IriStemRangeExclusions",
      },
    },
    IriStemRangeExclusions: {
      kind: "union",
      selector: (item) => (typeof item === "string" ? "IRIREF" : "IriStem"),
    },
    LiteralStem: {
      kind: "interface",
      properties: {
        stem: "STRING",
      },
    },
    LiteralStemRange: {
      kind: "interface",
      properties: {
        stem: "LiteralStemRangeStem",
        exclusions: "LiteralStemRangeExclusions",
      },
    },
    LiteralStemRangeStem: {
      kind: "union",
      selector: (item) => (typeof item === "string" ? "STRING" : "Wildcard"),
    },
    LiteralStemRangeExclusions: {
      kind: "union",
      selector: (item) => (typeof item === "string" ? "STRING" : "LiteralStem"),
    },
    Language: {
      kind: "interface",
      properties: {
        languageTag: "LANGTAG",
      },
    },
    LanguageStem: {
      kind: "interface",
      properties: {
        stem: "LANGTAG",
      },
    },
    LanguageStemRange: {
      kind: "interface",
      properties: {
        stem: "LanguageStemRangeStem",
        exclusions: "LanguageStemRangeExclusions",
      },
    },
    LanguageStemRangeStem: {
      kind: "union",
      selector: (item) => (typeof item === "string" ? "LANGTAG" : "Wildcard"),
    },
    LanguageStemRangeExclusions: {
      kind: "union",
      selector: (item) =>
        typeof item === "string" ? "LANGTAG" : "LanguageStem",
    },
    Wildcard: {
      kind: "interface",
      properties: {},
    },
    Shape: {
      kind: "interface",
      properties: {
        closed: "BOOL",
        extra: "IRIREF",
        extends: "shapeExprOrRef",
        expression: "tripleExprOrRef",
        semActs: "SemAct",
        annotations: "Annotation",
      },
    },
    tripleExpr: {
      kind: "union",
      selector: (item) => item.type,
    },
    tripleExprOrRef: {
      kind: "union",
      selector: (item) =>
        typeof item === "string" ? "tripleExprRef" : "tripleExpr",
    },
    EachOf: {
      kind: "interface",
      properties: {
        id: "tripleExprLabel",
        min: "INTEGER",
        max: "INTEGER",
        expressions: "tripleExprOrRef",
        semActs: "SemAct",
        annotations: "Annotation",
      },
    },
    OneOf: {
      kind: "interface",
      properties: {
        id: "tripleExprLabel",
        min: "INTEGER",
        max: "INTEGER",
        expressions: "tripleExprOrRef",
        semActs: "SemAct",
        annotations: "Annotation",
      },
    },
    TripleConstraint: {
      kind: "interface",
      properties: {
        id: "tripleExprLabel",
        min: "INTEGER",
        max: "INTEGER",
        inverse: "BOOL",
        predicate: "IRIREF",
        valueExpr: "shapeExprOrRef",
        semActs: "SemAct",
        annotations: "Annotation",
      },
    },
    tripleExprRef: {
      kind: "union",
      selector: () => "tripleExprLabel",
    },
    tripleExprLabel: {
      kind: "union",
      selector: () => "IRIREF",
    },
    SemAct: {
      kind: "interface",
      properties: {
        name: "IRIREF",
        code: "STRING",
      },
    },
    Annotation: {
      kind: "interface",
      properties: {
        predicate: "IRI",
        object: "objectValue",
      },
    },
    IRIREF: {
      kind: "primitive",
    },
    BNODE: {
      kind: "primitive",
    },
    INTEGER: {
      kind: "primitive",
    },
    STRING: {
      kind: "primitive",
    },
    DECIMAL: {
      kind: "primitive",
    },
    DOUBLE: {
      kind: "primitive",
    },
    LANGTAG: {
      kind: "primitive",
    },
    BOOL: {
      kind: "primitive",
    },
    IRI: {
      kind: "primitive",
    },
  };
