# ShexJ Traverser

Traverse a ShexJ schema with custom functionality.

## Installation
```bash
npm i @ldo/traverser-shexj
```

## Tutorial
This library uses `type-traverser`. To learn more about how type traverser can be used, go to the [Type Traverser Tutorial](https://github.com/o-development/type-traverser/blob/master/README.md#using-a-traverser).

## Usage
There are two ways you can use the ShexJ-Traverser:
 - A `visitor`
 - A `transformer`

### Visitor
This visitor shows all the possible visitor functions you can use. Note that you do not need to define every visitor function, only the ones you care about.

Run `npm run start` to see this code in action.

```typescript
const shexJVisitor = shexJTraverser.createVisitor<undefined>({
  Schema: {
    visitor: async (_item, _context) => {
      console.log("Schema");
    },
    properties: {
      startActs: async (_item, _context) => {
        console.log("Schema.startActs");
      },
      start: async (_item, _context) => {
        console.log("Schema.start");
      },
      imports: async (_item, _context) => {
        console.log("Schema.imports");
      },
      shapes: async (_item, _context) => {
        console.log("Schema.shape");
      },
    },
  },
  shapeExpr: async (_item, _context) => {
    console.log("shapeExpr");
  },
  ShapeOr: {
    visitor: async (_item, _context) => {
      console.log("ShapeOr");
    },
    properties: {
      id: async (_item, _context) => {
        console.log("ShapeOr.id");
      },
      shapeExprs: async (_item, _context) => {
        console.log("ShapeOr.shapeExprs");
      },
    },
  },
  ShapeAnd: {
    visitor: async (_item, _context) => {
      console.log("ShapeAnd");
    },
    properties: {
      id: async (_item, _context) => {
        console.log("ShapeAnd.id");
      },
      shapeExprs: async (_item, _context) => {
        console.log("ShapeAnd.shapeExprs");
      },
    },
  },
  ShapeNot: {
    visitor: async (_item, _context) => {
      console.log("ShapeNot");
    },
    properties: {
      id: async (_item, _context) => {
        console.log("ShapeNot.id");
      },
      shapeExpr: async (_item, _context) => {
        console.log("ShapeNot.shapeExpr");
      },
    },
  },
  ShapeExternal: {
    visitor: async (_item, _context) => {
      console.log("ShapeExternal");
    },
    properties: {
      id: async (_item, _context) => {
        console.log("ShapeExternal.id");
      },
    },
  },
  shapeExprRef: async (_item, _context) => {
    console.log("shapeExprRef");
  },
  NodeConstraint: {
    visitor: async (_item, _context) => {
      console.log("NodeConstraint");
    },
    properties: {
      id: async (_item, _context) => {
        console.log("NodeConstraint.id");
      },
      datatype: async (_item, _context) => {
        console.log("NodeConstraint.datatype");
      },
      values: async (_item, _context) => {
        console.log("NodeConstraint.values");
      },
      length: async (_item, _context) => {
        console.log("NodeConstraint.length");
      },
      minlength: async (_item, _context) => {
        console.log("NodeConstraint.minlength");
      },
      maxlength: async (_item, _context) => {
        console.log("NodeConstraint.maxlength");
      },
      pattern: async (_item, _context) => {
        console.log("NodeConstraint.pattern");
      },
      flags: async (_item, _context) => {
        console.log("NodeConstraint.flags");
      },
      mininclusive: async (_item, _context) => {
        console.log("NodeConstraint.mininclusive");
      },
      minexclusive: async (_item, _context) => {
        console.log("NodeConstraint.minexclusive");
      },
      maxinclusive: async (_item, _context) => {
        console.log("NodeConstraint.maxinclusive");
      },
      maxexclusive: async (_item, _context) => {
        console.log("NodeConstraint.maxexclusive");
      },
      totaldigits: async (_item, _context) => {
        console.log("NodeConstraint.totaldigits");
      },
      fractiondigits: async (_item, _context) => {
        console.log("NodeConstraints.fractiondigits");
      },
    },
  },
  numericLiteral: async (_item, _context) => {
    console.log("numericLiteral");
  },
  valueSetValue: async (_item, _context) => {
    console.log("valueSetValue");
  },
  objectValue: async (_item, _context) => {
    console.log("objectValue");
  },
  ObjectLiteral: {
    visitor: async (_item, _context) => {
      console.log("ObjectLiteral");
    },
    properties: {
      value: async (_item, _context) => {
        console.log("ObjectLiteral.value");
      },
      language: async (_item, _context) => {
        console.log("ObjectLiteral.language");
      },
      type: async (_item, _context) => {
        console.log("ObjectLiteral.type");
      },
    },
  },
  IriStem: {
    visitor: async (_item, _context) => {
      console.log("IriStem");
    },
    properties: {
      stem: async (_item, _context) => {
        console.log("IriStem.stem");
      },
    },
  },
  IriStemRange: {
    visitor: async (_item, _context) => {
      console.log("IriStemRange");
    },
    properties: {
      stem: async (_item, _context) => {
        console.log("IriStemRange.stem");
      },
      exclusions: async (_item, _context) => {
        console.log("IriStemRange.exclusions");
      },
    },
  },
  IriStemRangeStem: async (_item, _context) => {
    console.log("IriStemRangeStem");
  },
  IriStemRangeExclusions: async (_item, _context) => {
    console.log("IriStemRangeExclusions");
  },
  LiteralStem: {
    visitor: async (_item, _context) => {
      console.log("LiteralStem");
    },
    properties: {
      stem: async (_item, _context) => {
        console.log("LiteralStem.stem");
      },
    },
  },
  LiteralStemRange: {
    visitor: async (_item, _context) => {
      console.log("LiteralStemRange");
    },
    properties: {
      stem: async (_item, _context) => {
        console.log("LiteralStemRange.stem");
      },
      exclusions: async (_item, _context) => {
        console.log("LiteralStemRange.exclusions");
      },
    },
  },
  LiteralStemRangeStem: async (_item, _context) => {
    console.log("LiteralStemRangeStem");
  },
  LiteralStemRangeExclusions: async (_item, _context) => {
    console.log("LiteralStemRangeExclusions");
  },
  Language: {
    visitor: async (_item, _context) => {
      console.log("Language");
    },
    properties: {
      languageTag: async (_item, _context) => {
        console.log("Language.languageTag");
      },
    },
  },
  LanguageStem: {
    visitor: async (_item, _context) => {
      console.log("LanguageStem");
    },
    properties: {
      stem: async (_item, _context) => {
        console.log("LanguageStem.stem");
      },
    },
  },
  LanguageStemRange: {
    visitor: async (_item, _context) => {
      console.log("LanguageStemRange");
    },
    properties: {
      stem: async (_item, _context) => {
        console.log("LanguageStemRange.stem");
      },
      exclusions: async (_item, _context) => {
        console.log("LanguageStemRange.exclusions");
      },
    },
  },
  LanguageStemRangeStem: async (_item, _context) => {
    console.log("LanguageStemRangeStem");
  },
  LanguageStemRangeExclusions: async (_item, _context) => {
    console.log("LanguageStemRangeExclusions");
  },
  Wildcard: {
    visitor: async (_item, _context) => {
      console.log("Wildcard");
    },
  },
  Shape: {
    visitor: async (_item, _context) => {
      console.log("Shape");
    },
    properties: {
      id: async (_item, _context) => {
        console.log("Shape.id");
      },
      closed: async (_item, _context) => {
        console.log("Shape.closed");
      },
      extra: async (_item, _context) => {
        console.log("Shape.extra");
      },
      expression: async (_item, _context) => {
        console.log("Shape.expression");
      },
      semActs: async (_item, _context) => {
        console.log("Shape.semActs");
      },
      annotations: async (_item, _context) => {
        console.log("Shape.annotations");
      },
    },
  },
  tripleExpr: async (_item, _context) => {
    console.log("tripleExpr");
  },
  EachOf: {
    visitor: async (_item, _context) => {
      console.log("EachOf");
    },
    properties: {
      expressions: async (_item, _context) => {
        console.log("EachOf.expressions");
      },
      id: async (_item, _context) => {
        console.log("EachOf.id");
      },
      min: async (_item, _context) => {
        console.log("EachOf.min");
      },
      max: async (_item, _context) => {
        console.log("EachOf.max");
      },
      semActs: async (_item, _context) => {
        console.log("EachOf.semActs");
      },
      annotations: async (_item, _context) => {
        console.log("EachOf.annotations");
      },
    },
  },
  OneOf: {
    visitor: async (_item, _context) => {
      console.log("OneOf");
    },
    properties: {
      expressions: async (_item, _context) => {
        console.log("OneOf.expressions");
      },
      id: async (_item, _context) => {
        console.log("OneOf.id");
      },
      min: async (_item, _context) => {
        console.log("OneOf.min");
      },
      max: async (_item, _context) => {
        console.log("OneOf.max");
      },
      semActs: async (_item, _context) => {
        console.log("OneOf.semActs");
      },
      annotations: async (_item, _context) => {
        console.log("OneOf.annotations");
      },
    },
  },
  TripleConstraint: {
    visitor: async (_item, _context) => {
      console.log("TripleConstraint");
    },
    properties: {
      inverse: async (_item, _context) => {
        console.log("TripleConstraint.inverse");
      },
      predicate: async (_item, _context) => {
        console.log("TripleConstraint.predicate");
      },
      valueExpr: async (_item, _context) => {
        console.log("TripleConstraint.valueExpr");
      },
      id: async (_item, _context) => {
        console.log("TripleConstraint.id");
      },
      min: async (_item, _context) => {
        console.log("TripleConstraint.min");
      },
      max: async (_item, _context) => {
        console.log("TripleConstraint.max");
      },
      semActs: async (_item, _context) => {
        console.log("TripleConstraint.semActs");
      },
      annotations: async (_item, _context) => {
        console.log("TripleConstraint.annotations");
      },
    },
  },
  tripleExprRef: async (_item, _context) => {
    console.log("tripleExprRef");
  },
  SemAct: {
    visitor: async (_item, _context) => {
      console.log("SemAct");
    },
    properties: {
      name: async (_item, _context) => {
        console.log("SemAct.name");
      },
      code: async (_item, _context) => {
        console.log("SemAct.code");
      },
    },
  },
  Annotation: {
    visitor: async (_item, _context) => {
      console.log("Annotation");
    },
    properties: {
      predicate: async (_item, _context) => {
        console.log("Annotation.predicate");
      },
      object: async (_item, _context) => {
        console.log("Annotation.object");
      },
    },
  },
  IRIREF: async (_item, _context) => {
    console.log("IRIREF");
  },
  STRING: async (_item, _context) => {
    console.log("STRING");
  },
  LANGTAG: async (_item, _context) => {
    console.log("LANGTAG");
  },
  INTEGER: async (_item, _context) => {
    console.log("INTEGER");
  },
  BOOL: async (_item, _context) => {
    console.log("BOOL");
  },
  IRI: async (_item, _context) => {
    console.log("IRI");
  },
});

/**
 * Sample Data
 */
const simpleSchema: Schema = {
  type: "Schema",
  shapes: [
    {
      type: "Shape",
      id: "http://shex.io/webapps/shex.js/doc/EmployeeShape",
      expression: {
        type: "EachOf",
        expressions: [
          {
            type: "TripleConstraint",
            predicate: "http://xmlns.com/foaf/0.1/givenName",
            valueExpr: {
              type: "NodeConstraint",
              datatype: "http://www.w3.org/2001/XMLSchema#string",
            },
            min: 1,
            max: -1,
          },
          {
            type: "TripleConstraint",
            predicate: "http://xmlns.com/foaf/0.1/familyName",
            valueExpr: {
              type: "NodeConstraint",
              datatype: "http://www.w3.org/2001/XMLSchema#string",
            },
          },
          {
            type: "TripleConstraint",
            predicate: "http://xmlns.com/foaf/0.1/phone",
            valueExpr: {
              type: "NodeConstraint",
              nodeKind: "iri",
            },
            min: 0,
            max: -1,
          },
          {
            type: "TripleConstraint",
            predicate: "http://xmlns.com/foaf/0.1/mbox",
            valueExpr: {
              type: "NodeConstraint",
              nodeKind: "iri",
            },
          },
        ],
      },
    },
  ],
  "@context": "http://www.w3.org/ns/shex.jsonld",
};

await shexJVisitor.visit(simpleSchema, "Schema", undefined);
// Logs:
// Schema
// Schema.startActs
// Schema.start
// Schema.imports
// Schema.shape
// shapeExpr
// Shape
// Shape.id
// shapeExprRef
// Shape.closed
// Shape.extra
// Shape.expression
// tripleExpr
// EachOf
// EachOf.expressions
// tripleExpr
// TripleConstraint
// TripleConstraint.inverse
// TripleConstraint.predicate
// IRIREF
// TripleConstraint.valueExpr
// shapeExpr
// NodeConstraint
// NodeConstraint.id
// NodeConstraint.datatype
// IRIREF
// NodeConstraint.values
// NodeConstraint.length
// NodeConstraint.minlength
// NodeConstraint.maxlength
// NodeConstraint.pattern
// NodeConstraint.flags
// NodeConstraint.mininclusive
// NodeConstraint.minexclusive
// NodeConstraint.maxinclusive
// NodeConstraint.maxexclusive
// NodeConstraint.totaldigits
// NodeConstraints.fractiondigits
// TripleConstraint.id
// TripleConstraint.min
// INTEGER
// TripleConstraint.max
// INTEGER
// TripleConstraint.semActs
// TripleConstraint.annotations
// tripleExpr
// TripleConstraint
// TripleConstraint.inverse
// TripleConstraint.predicate
// IRIREF
// TripleConstraint.valueExpr
// shapeExpr
// NodeConstraint
// NodeConstraint.id
// NodeConstraint.datatype
// NodeConstraint.values
// NodeConstraint.length
// NodeConstraint.minlength
// NodeConstraint.maxlength
// NodeConstraint.pattern
// NodeConstraint.flags
// NodeConstraint.mininclusive
// NodeConstraint.minexclusive
// NodeConstraint.maxinclusive
// NodeConstraint.maxexclusive
// NodeConstraint.totaldigits
// NodeConstraints.fractiondigits
// TripleConstraint.id
// TripleConstraint.min
// TripleConstraint.max
// TripleConstraint.semActs
// TripleConstraint.annotations
// tripleExpr
// TripleConstraint
// TripleConstraint.inverse
// TripleConstraint.predicate
// IRIREF
// TripleConstraint.valueExpr
// shapeExpr
// NodeConstraint
// NodeConstraint.id
// NodeConstraint.datatype
// NodeConstraint.values
// NodeConstraint.length
// NodeConstraint.minlength
// NodeConstraint.maxlength
// NodeConstraint.pattern
// NodeConstraint.flags
// NodeConstraint.mininclusive
// NodeConstraint.minexclusive
// NodeConstraint.maxinclusive
// NodeConstraint.maxexclusive
// NodeConstraint.totaldigits
// NodeConstraints.fractiondigits
// TripleConstraint.id
// TripleConstraint.min
// INTEGER
// TripleConstraint.max
// TripleConstraint.semActs
// TripleConstraint.annotations
// tripleExpr
// TripleConstraint
// TripleConstraint.inverse
// TripleConstraint.predicate
// IRIREF
// TripleConstraint.valueExpr
// shapeExpr
// NodeConstraint
// NodeConstraint.id
// NodeConstraint.datatype
// NodeConstraint.values
// NodeConstraint.length
// NodeConstraint.minlength
// NodeConstraint.maxlength
// NodeConstraint.pattern
// NodeConstraint.flags
// NodeConstraint.mininclusive
// NodeConstraint.minexclusive
// NodeConstraint.maxinclusive
// NodeConstraint.maxexclusive
// NodeConstraint.totaldigits
// NodeConstraints.fractiondigits
// TripleConstraint.id
// TripleConstraint.min
// TripleConstraint.max
// TripleConstraint.semActs
// TripleConstraint.annotations
// EachOf.id
// EachOf.min
// EachOf.max
// EachOf.semActs
// EachOf.annotations
// Shape.semActs
// Shape.annotations
```

### Transformer
This transformer shows all the possible return types. Note that you do not need to define every return type yourself. This library will automatically deduce return types.

```typescript
const shexJTransformer = shexJTraverser.createTransformer<
  {
    Schema: {
      return: string;
      properties: {
        startActs: string;
        start: string;
        imports: string;
        shapes: string;
      };
    };
    shapeExpr: {
      return: string;
    };
    ShapeOr: {
      return: string;
      properties: {
        id: string;
        shapeExprs: string;
      };
    };
    ShapeAnd: {
      return: string;
      properties: {
        id: string;
        shapeExprs: string;
      };
    };
    ShapeNot: {
      return: string;
      properties: {
        id: string;
        shapeExpr: string;
      };
    };
    ShapeExternal: {
      return: string;
      properties: {
        id: string;
      };
    };
    shapeExprRef: {
      return: string;
    };
    NodeConstraint: {
      return: string;
      properties: {
        id: string;
        datatype: string;
        values: string;
        length: string;
        minlength: string;
        maxlength: string;
        pattern: string;
        flags: string;
        mininclusive: string;
        minexclusive: string;
        maxinclusive: string;
        maxexclusive: string;
        totaldigits: string;
        fractiondigits: string;
      };
    };
    numericLiteral: {
      return: string;
    };
    valueSetValue: {
      return: string;
    };
    objectValue: {
      return: string;
    };
    ObjectLiteral: {
      return: string;
      properties: {
        value: string;
        language: string;
        type: string;
      };
    };
    IriStem: {
      return: string;
      properties: {
        stem: string;
      };
    };
    IriStemRange: {
      return: string;
      properties: {
        stem: string;
        exclusions: string;
      };
    };
    IriStemRangeStem: {
      return: string;
    };
    IriStemRangeExclusions: {
      return: string;
    };
    LiteralStem: {
      return: string;
      properties: {
        stem: string;
      };
    };
    LiteralStemRange: {
      return: string;
      properties: {
        stem: string;
        exclusions: string;
      };
    };
    LiteralStemRangeStem: {
      return: string;
    };
    LiteralStemRangeExclusions: {
      return: string;
    };
    Language: {
      return: string;
      properties: {
        languageTag: string;
      };
    };
    LanguageStem: {
      return: string;
      properties: {
        stem: string;
      };
    };
    LanguageStemRangeStem: {
      return: string;
    };
    LanguageStemRangeExclusions: {
      return: string;
    };
    Wildcard: {
      return: string;
    };
    Shape: {
      return: string;
      properties: {
        id: string;
        closed: string;
        extra: string;
        expression: string;
        semActs: string;
        annotations: string;
      };
    };
    tripleExpr: {
      return: string;
    };
    EachOf: {
      return: string;
      properties: {
        expressions: string;
        id: string;
        min: string;
        max: string;
        semActs: string;
        annotations: string;
      };
    };
    OneOf: {
      return: string;
      properties: {
        expressions: string;
        id: string;
        min: string;
        max: string;
        semActs: string;
        annotations: string;
      };
    };
    TripleConstraint: {
      return: string;
      properties: {
        inverse: string;
        predicate: string;
        valueExpr: string;
        id: string;
        min: string;
        max: string;
        semActs: string;
        annotations: string;
      };
    };
    tripleExprRef: {
      return: string;
    };
    SemAct: {
      return: string;
      properties: {
        name: string;
        code: string;
      };
    };
    Annotation: {
      return: string;
      properties: {
        predicate: string;
        object: string;
      };
    };
    IRIREF: {
      return: string;
    };
    STRING: {
      return: string;
    };
    LANGTAG: {
      return: string;
    };
    INTEGER: {
      return: string;
    };
    BOOL: {
      return: string;
    };
    IRI: {
      return: string;
    };
  },
  undefined
>({
  Schema: {
    transformer: async (
      item,
      getTransformedChildren,
      _setReturnPointer,
      _context
    ) => {
      const children: {
        startActs: string;
        start: string;
        imports: string;
        shapes: string;
      } = await getTransformedChildren();
      return `Transformer(startActs:${children.startActs},start:${children.start},imports:${children.imports},shapes:${children.shapes})`;
    },
  },
  // ...
});
```

## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT