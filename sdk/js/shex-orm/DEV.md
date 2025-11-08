# How this Package is Structured

This package provides a tool to convert SHEX shapes to TypeScript definitions that can be used to create typed ORM objects.


The tool consists of two main components:
- A transformer that translates a SHEX definition into a simplified schema expressed in JSON
- A transformer that translates a SHEX definition into TypeScript type definitions

The transformers are based on `@ldo/traverser-shexj`.

For each SHEX file, the tool creates three TypeScript files:
- A schema file like `person.schema.ts`
- A typings file like `person.typings.ts`
- A shape type file like `person.shapeTypes.ts` which contains a `ShapeType` that consists of the schema, the type, and the IRI of the main shape

## Generated Output

### ShapeType File

```ts
export const PersonShapeType: ShapeType<Person> = {
  schema: personSchema,
  shape: "http://example.org/PersonShape",
};
```

### Schema File

```ts
import type { Schema } from "@ng-org/shex-orm";

export const personSchema: Schema = {
  "http://example.org/PersonShape": {
    iri: "http://example.org/PersonShape",
    predicates: [
      {
        dataTypes: [{ valType: "literal", literals: ["http://example.org/Person"] }],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [{ valType: "string" }],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/name",
        readablePredicate: "name",
      },
      {
        dataTypes: [{ valType: "string" }],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "http://example.org/email",
        readablePredicate: "email",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "http://example.org/PersonShape||http://example.org/address",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "http://example.org/address",
        readablePredicate: "address",
      },
    ],
  },
  "http://example.org/PersonShape||http://example.org/address": {
    iri: "http://example.org/PersonShape||http://example.org/address",
    predicates: [
      {
        dataTypes: [{ valType: "string" }],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/city",
        readablePredicate: "city",
      },
    ],
  },
};
```

### Typings File

```ts
export type IRI = string;

export interface Person {
  readonly "@id": IRI;
  readonly "@graph": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "http://example.org/Person";
  /**
   * Original IRI: http://example.org/name
   */
  name: string;
  /**
   * Original IRI: http://example.org/email
   */
  email?: Set<string>;
  /**
   * Original IRI: http://example.org/address
   */
  address?: {
    readonly "@id": IRI;
    readonly "@graph": IRI;
    /**
     * Original IRI: http://example.org/city
     */
    city: string;
  };
}
```

### Standard Properties

- **`@type`**: The RDF type IRI (from `rdf:type`) is always converted to the property name `@type` by default
- **`@id` and `@graph`**: These properties are automatically added to all typed objects as readonly properties

### Cardinality Handling

Predicates with a cardinality higher than 1 (i.e., `maxCardinality > 1` or `maxCardinality === -1` for unlimited) are represented as TypeScript `Set<T>` types.

### Readable Predicate Names

The `readablePredicate` field is automatically generated from the predicate IRI and becomes the property name in the TypeScript interface.

**Generation Rules:**

1. **Special case**: `rdf:type` (`http://www.w3.org/1999/02/22-rdf-syntax-ns#type`) always becomes `@type`

2. **No conflicts**: If the last segment of the IRI is unique within the shape, it's used as-is:
   - `http://example.org/name` → `name`
   - `http://schema.org/email` → `email`

3. **Conflict resolution**: When multiple predicates in the same shape share the same last segment (local name), **all** predicates in that collision group are renamed using prefixes:
   - The algorithm walks backward through IRI segments (right to left)
   - For each predicate, it tries `{prefix}_{localName}` combinations until finding an unused name
   - Example: Both `http://foaf.org/name` and `http://schema.org/name` would become `foaf_name` and `schema_name`

4. **Fallback**: If prefix combinations are exhausted, a composite name is generated from all IRI segments (excluding protocol) with incrementing numbers for uniqueness:
   - Pattern: `{composite}_{localName}` or `{composite}_{localName}_1`, `{composite}_{localName}_2`, etc.

**Character sanitization**: Special characters (except dots and dashes) are replaced with underscores to ensure valid JavaScript identifiers.

**Note**: You can **manually edit** the `readablePredicate` values in the generated schema files if you prefer different property names. The schema acts as the single source of truth for property naming.