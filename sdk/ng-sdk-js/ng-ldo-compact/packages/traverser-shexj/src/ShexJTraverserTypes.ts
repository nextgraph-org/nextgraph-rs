import type {
  Annotation,
  BNODE,
  BOOL,
  DECIMAL,
  DOUBLE,
  EachOf,
  INTEGER,
  IRI,
  IRIREF,
  IriStem,
  IriStemRange,
  LANGTAG,
  Language,
  LanguageStem,
  LanguageStemRange,
  LiteralStem,
  LiteralStemRange,
  NodeConstraint,
  numericLiteral,
  ObjectLiteral,
  objectValue,
  OneOf,
  Schema,
  SemAct,
  Shape,
  ShapeAnd,
  ShapeDecl,
  shapeDeclLabel,
  shapeDeclRef,
  shapeExpr,
  shapeExprOrRef,
  ShapeExternal,
  ShapeNot,
  ShapeOr,
  STRING,
  TripleConstraint,
  tripleExpr,
  tripleExprLabel,
  tripleExprOrRef,
  tripleExprRef,
  valueSetValue,
  Wildcard,
} from "./ShexJTypes.js";
import type { ValidateTraverserTypes } from "@ldo/type-traverser";

export type ShexJTraverserTypes = ValidateTraverserTypes<{
  Schema: {
    kind: "interface";
    type: Schema;
    properties: {
      startActs: "SemAct";
      start: "shapeExprOrRef";
      imports: "IRIREF";
      shapes: "ShapeDecl";
    };
  };
  ShapeDecl: {
    kind: "interface";
    type: ShapeDecl;
    properties: {
      id: "shapeDeclLabel";
      abstract: "BOOL";
      restricts: "shapeExprOrRef";
      shapeExpr: "shapeExpr";
    };
  };
  shapeExpr: {
    kind: "union";
    type: shapeExpr;
    typeNames:
      | "ShapeOr"
      | "ShapeAnd"
      | "ShapeNot"
      | "NodeConstraint"
      | "Shape"
      | "ShapeExternal";
  };
  shapeExprOrRef: {
    kind: "union";
    type: shapeExprOrRef;
    typeNames: "shapeExpr" | "shapeDeclRef";
  };
  ShapeOr: {
    kind: "interface";
    type: ShapeOr;
    properties: {
      shapeExprs: "shapeExprOrRef";
    };
  };
  ShapeAnd: {
    kind: "interface";
    type: ShapeAnd;
    properties: {
      shapeExprs: "shapeExprOrRef";
    };
  };
  ShapeNot: {
    kind: "interface";
    type: ShapeNot;
    properties: {
      shapeExpr: "shapeExprOrRef";
    };
  };
  ShapeExternal: {
    kind: "interface";
    type: ShapeExternal;
    properties: Record<string, never>;
  };
  shapeDeclRef: {
    kind: "union";
    type: shapeDeclRef;
    typeNames: "shapeDeclLabel" | "ShapeDecl";
  };
  shapeDeclLabel: {
    kind: "union";
    type: shapeDeclLabel;
    typeNames: "IRIREF" | "BNODE";
  };
  NodeConstraint: {
    kind: "interface";
    type: NodeConstraint;
    properties: {
      datatype: "IRIREF";
      values: "valueSetValue";
      length: "INTEGER";
      minlength: "INTEGER";
      maxlength: "INTEGER";
      pattern: "STRING";
      flags: "STRING";
      mininclusive: "numericLiteral";
      minexclusive: "numericLiteral";
      totaldigits: "INTEGER";
      fractiondigits: "INTEGER";
      semActs: "SemAct";
      annotations: "Annotation";
    };
  };
  numericLiteral: {
    kind: "union";
    type: numericLiteral;
    typeNames: "INTEGER" | "DECIMAL" | "DOUBLE";
  };
  valueSetValue: {
    kind: "union";
    type: valueSetValue;
    typeNames:
      | "objectValue"
      | "IriStem"
      | "IriStemRange"
      | "LiteralStem"
      | "LiteralStemRange"
      | "Language"
      | "LanguageStem"
      | "LanguageStemRange";
  };
  objectValue: {
    kind: "union";
    type: objectValue;
    typeNames: "IRIREF" | "ObjectLiteral";
  };
  ObjectLiteral: {
    kind: "interface";
    type: ObjectLiteral;
    properties: {
      value: "STRING";
      language: "STRING";
      type: "STRING";
    };
  };
  IriStem: {
    kind: "interface";
    type: IriStem;
    properties: {
      stem: "IRIREF";
    };
  };
  IriStemRange: {
    kind: "interface";
    type: IriStemRange;
    properties: {
      stem: "IRIREF";
      exclusions: "IriStemRangeExclusions";
    };
  };
  IriStemRangeExclusions: {
    kind: "union";
    type: IRIREF | IriStem;
    typeNames: "IRIREF" | "IriStem";
  };
  LiteralStem: {
    kind: "interface";
    type: LiteralStem;
    properties: {
      stem: "STRING";
    };
  };
  LiteralStemRange: {
    kind: "interface";
    type: LiteralStemRange;
    properties: {
      stem: "LiteralStemRangeStem";
      exclusions: "LiteralStemRangeExclusions";
    };
  };
  LiteralStemRangeStem: {
    kind: "union";
    type: STRING | Wildcard;
    typeNames: "STRING" | "Wildcard";
  };
  LiteralStemRangeExclusions: {
    kind: "union";
    type: STRING | LiteralStem;
    typeNames: "STRING" | "LiteralStem";
  };
  Language: {
    kind: "interface";
    type: Language;
    properties: {
      languageTag: "LANGTAG";
    };
  };
  LanguageStem: {
    kind: "interface";
    type: LanguageStem;
    properties: {
      stem: "LANGTAG";
    };
  };
  LanguageStemRange: {
    kind: "interface";
    type: LanguageStemRange;
    properties: {
      stem: "LanguageStemRangeStem";
      exclusions: "LanguageStemRangeExclusions";
    };
  };
  LanguageStemRangeStem: {
    kind: "union";
    type: LANGTAG | Wildcard;
    typeNames: "LANGTAG" | "Wildcard";
  };
  LanguageStemRangeExclusions: {
    kind: "union";
    type: LANGTAG | LanguageStem;
    typeNames: "LANGTAG" | "LanguageStem";
  };
  Wildcard: {
    kind: "interface";
    type: Wildcard;
    properties: Record<string, never>;
  };
  Shape: {
    kind: "interface";
    type: Shape;
    properties: {
      closed: "BOOL";
      extra: "IRIREF";
      extends: "shapeExprOrRef";
      expression: "tripleExprOrRef";
      semActs: "SemAct";
      annotations: "Annotation";
    };
  };
  tripleExpr: {
    kind: "union";
    type: tripleExpr;
    typeNames: "EachOf" | "OneOf" | "TripleConstraint";
  };
  tripleExprOrRef: {
    kind: "union";
    type: tripleExprOrRef;
    typeNames: "tripleExpr" | "tripleExprRef";
  };
  EachOf: {
    kind: "interface";
    type: EachOf;
    properties: {
      id: "tripleExprLabel";
      min: "INTEGER";
      max: "INTEGER";
      expressions: "tripleExprOrRef";
      semActs: "SemAct";
      annotations: "Annotation";
    };
  };
  OneOf: {
    kind: "interface";
    type: OneOf;
    properties: {
      id: "tripleExprLabel";
      min: "INTEGER";
      max: "INTEGER";
      expressions: "tripleExprOrRef";
      semActs: "SemAct";
      annotations: "Annotation";
    };
  };
  TripleConstraint: {
    kind: "interface";
    type: TripleConstraint;
    properties: {
      id: "tripleExprLabel";
      min: "INTEGER";
      max: "INTEGER";
      inverse: "BOOL";
      predicate: "IRIREF";
      valueExpr: "shapeExprOrRef";
      semActs: "SemAct";
      annotations: "Annotation";
    };
  };
  tripleExprRef: {
    kind: "union";
    type: tripleExprRef;
    typeNames: "tripleExprLabel";
  };
  tripleExprLabel: {
    kind: "union";
    type: tripleExprLabel;
    typeNames: "IRIREF" | "BNODE";
  };
  SemAct: {
    kind: "interface";
    type: SemAct;
    properties: {
      name: "IRIREF";
      code: "STRING";
    };
  };
  Annotation: {
    kind: "interface";
    type: Annotation;
    properties: {
      predicate: "IRI";
      object: "objectValue";
    };
  };
  IRIREF: {
    kind: "primitive";
    type: IRIREF;
  };
  BNODE: {
    kind: "primitive";
    type: BNODE;
  };
  INTEGER: {
    kind: "primitive";
    type: INTEGER;
  };
  STRING: {
    kind: "primitive";
    type: STRING;
  };
  DECIMAL: {
    kind: "primitive";
    type: DECIMAL;
  };
  DOUBLE: {
    kind: "primitive";
    type: DOUBLE;
  };
  LANGTAG: {
    kind: "primitive";
    type: LANGTAG;
  };
  BOOL: {
    kind: "primitive";
    type: BOOL;
  };
  IRI: {
    kind: "primitive";
    type: IRI;
  };
}>;
