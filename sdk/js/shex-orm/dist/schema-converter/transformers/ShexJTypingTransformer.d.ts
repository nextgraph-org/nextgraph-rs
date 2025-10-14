import type { Annotation } from "shexj";
import * as dom from "dts-dom";
import type { InterfaceDeclaration } from "dts-dom";
export interface ShapeInterfaceDeclaration extends InterfaceDeclaration {
    shapeId?: string;
}
export declare const additionalCompactEnumAliases: Set<string>;
export interface CompactTransformerContext {
    getNameFromIri: (iri: string, rdfType?: string) => string;
}
export declare function toCamelCase(text: string): string;
/**
 * Name functions
 */
export declare function iriToName(iri: string): string;
export declare function nameFromAnnotationOrId(obj: {
    id?: string;
    annotations?: Annotation[];
}): string | undefined;
export declare const ShexJTypingTransformerCompact: import("@ldo/type-traverser").Transformer<{
    Schema: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").Schema;
        properties: {
            startActs: "SemAct";
            start: "shapeExprOrRef";
            imports: "IRIREF";
            shapes: "ShapeDecl";
        };
    };
    ShapeDecl: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").ShapeDecl;
        properties: {
            id: "shapeDeclLabel";
            abstract: "BOOL";
            restricts: "shapeExprOrRef";
            shapeExpr: "shapeExpr";
        };
    };
    shapeExpr: {
        kind: "union";
        type: import("@ldo/traverser-shexj").shapeExpr;
        typeNames: "ShapeOr" | "ShapeAnd" | "ShapeNot" | "NodeConstraint" | "Shape" | "ShapeExternal";
    };
    shapeExprOrRef: {
        kind: "union";
        type: import("@ldo/traverser-shexj").shapeExprOrRef;
        typeNames: "shapeExpr" | "shapeDeclRef";
    };
    ShapeOr: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").ShapeOr;
        properties: {
            shapeExprs: "shapeExprOrRef";
        };
    };
    ShapeAnd: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").ShapeAnd;
        properties: {
            shapeExprs: "shapeExprOrRef";
        };
    };
    ShapeNot: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").ShapeNot;
        properties: {
            shapeExpr: "shapeExprOrRef";
        };
    };
    ShapeExternal: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").ShapeExternal;
        properties: Record<string, never>;
    };
    shapeDeclRef: {
        kind: "union";
        type: import("@ldo/traverser-shexj").shapeDeclRef;
        typeNames: "shapeDeclLabel" | "ShapeDecl";
    };
    shapeDeclLabel: {
        kind: "union";
        type: import("@ldo/traverser-shexj").shapeDeclLabel;
        typeNames: "IRIREF" | "BNODE";
    };
    NodeConstraint: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").NodeConstraint;
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
        type: import("@ldo/traverser-shexj").numericLiteral;
        typeNames: "INTEGER" | "DECIMAL" | "DOUBLE";
    };
    valueSetValue: {
        kind: "union";
        type: import("@ldo/traverser-shexj").valueSetValue;
        typeNames: "objectValue" | "IriStem" | "IriStemRange" | "LiteralStem" | "LiteralStemRange" | "Language" | "LanguageStem" | "LanguageStemRange";
    };
    objectValue: {
        kind: "union";
        type: import("@ldo/traverser-shexj").objectValue;
        typeNames: "IRIREF" | "ObjectLiteral";
    };
    ObjectLiteral: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").ObjectLiteral;
        properties: {
            value: "STRING";
            language: "STRING";
            type: "STRING";
        };
    };
    IriStem: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").IriStem;
        properties: {
            stem: "IRIREF";
        };
    };
    IriStemRange: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").IriStemRange;
        properties: {
            stem: "IRIREF";
            exclusions: "IriStemRangeExclusions";
        };
    };
    IriStemRangeExclusions: {
        kind: "union";
        type: import("@ldo/traverser-shexj").IRIREF | import("@ldo/traverser-shexj").IriStem;
        typeNames: "IRIREF" | "IriStem";
    };
    LiteralStem: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").LiteralStem;
        properties: {
            stem: "STRING";
        };
    };
    LiteralStemRange: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").LiteralStemRange;
        properties: {
            stem: "LiteralStemRangeStem";
            exclusions: "LiteralStemRangeExclusions";
        };
    };
    LiteralStemRangeStem: {
        kind: "union";
        type: import("@ldo/traverser-shexj").STRING | import("@ldo/traverser-shexj").Wildcard;
        typeNames: "STRING" | "Wildcard";
    };
    LiteralStemRangeExclusions: {
        kind: "union";
        type: import("@ldo/traverser-shexj").STRING | import("@ldo/traverser-shexj").LiteralStem;
        typeNames: "STRING" | "LiteralStem";
    };
    Language: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").Language;
        properties: {
            languageTag: "LANGTAG";
        };
    };
    LanguageStem: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").LanguageStem;
        properties: {
            stem: "LANGTAG";
        };
    };
    LanguageStemRange: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").LanguageStemRange;
        properties: {
            stem: "LanguageStemRangeStem";
            exclusions: "LanguageStemRangeExclusions";
        };
    };
    LanguageStemRangeStem: {
        kind: "union";
        type: import("@ldo/traverser-shexj").LANGTAG | import("@ldo/traverser-shexj").Wildcard;
        typeNames: "LANGTAG" | "Wildcard";
    };
    LanguageStemRangeExclusions: {
        kind: "union";
        type: import("@ldo/traverser-shexj").LANGTAG | import("@ldo/traverser-shexj").LanguageStem;
        typeNames: "LANGTAG" | "LanguageStem";
    };
    Wildcard: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").Wildcard;
        properties: Record<string, never>;
    };
    Shape: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").Shape;
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
        type: import("@ldo/traverser-shexj").tripleExpr;
        typeNames: "EachOf" | "OneOf" | "TripleConstraint";
    };
    tripleExprOrRef: {
        kind: "union";
        type: import("@ldo/traverser-shexj").tripleExprOrRef;
        typeNames: "tripleExpr" | "tripleExprRef";
    };
    EachOf: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").EachOf;
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
        type: import("@ldo/traverser-shexj").OneOf;
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
        type: import("@ldo/traverser-shexj").TripleConstraint;
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
        type: import("@ldo/traverser-shexj").tripleExprRef;
        typeNames: "tripleExprLabel";
    };
    tripleExprLabel: {
        kind: "union";
        type: import("@ldo/traverser-shexj").tripleExprLabel;
        typeNames: "IRIREF" | "BNODE";
    };
    SemAct: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").SemAct;
        properties: {
            name: "IRIREF";
            code: "STRING";
        };
    };
    Annotation: {
        kind: "interface";
        type: import("@ldo/traverser-shexj").Annotation;
        properties: {
            predicate: "IRI";
            object: "objectValue";
        };
    };
    IRIREF: {
        kind: "primitive";
        type: import("@ldo/traverser-shexj").IRIREF;
    };
    BNODE: {
        kind: "primitive";
        type: import("@ldo/traverser-shexj").BNODE;
    };
    INTEGER: {
        kind: "primitive";
        type: import("@ldo/traverser-shexj").INTEGER;
    };
    STRING: {
        kind: "primitive";
        type: import("@ldo/traverser-shexj").STRING;
    };
    DECIMAL: {
        kind: "primitive";
        type: import("@ldo/traverser-shexj").DECIMAL;
    };
    DOUBLE: {
        kind: "primitive";
        type: import("@ldo/traverser-shexj").DOUBLE;
    };
    LANGTAG: {
        kind: "primitive";
        type: import("@ldo/traverser-shexj").LANGTAG;
    };
    BOOL: {
        kind: "primitive";
        type: import("@ldo/traverser-shexj").BOOL;
    };
    IRI: {
        kind: "primitive";
        type: import("@ldo/traverser-shexj").IRI;
    };
}, {
    Schema: {
        return: dom.TopLevelDeclaration[];
    };
    ShapeDecl: {
        return: dom.InterfaceDeclaration;
    };
    Shape: {
        return: dom.InterfaceDeclaration;
    };
    EachOf: {
        return: dom.ObjectType | dom.InterfaceDeclaration;
    };
    TripleConstraint: {
        return: dom.PropertyDeclaration;
    };
    NodeConstraint: {
        return: dom.Type;
    };
    ShapeOr: {
        return: dom.UnionType;
    };
    ShapeAnd: {
        return: dom.IntersectionType;
    };
    ShapeNot: {
        return: never;
    };
    ShapeExternal: {
        return: never;
    };
}, null>;
//# sourceMappingURL=ShexJTypingTransformer.d.ts.map