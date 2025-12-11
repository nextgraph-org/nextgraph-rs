# Schema Converter SHEX > TypeScript

[![Apache 2.0 Licensed][license-image]][license-link]
[![MIT Licensed][license-image2]][license-link2]
[![project chat](https://img.shields.io/badge/zulip-join_chat-brightgreen.svg)](https://forum.nextgraph.org)

CLI tool to convert SHEX shapes to schemas and TypeScript definitions ("shape types") that can be used for creating ORM objects.

## How to Use

Install `@ng-org/shex-orm` as dev dependency or globally (`--global`).

```bash
npm install --save-dev @ng-org/shex-orm
```

Then run

```bash
npx rdf-orm build --input ./src/shapes/shex --output ./src/shapes/orm
```

The input directory needs to contain shex files with one or more shape definitions each.
The output directory will contain the typescript files with type definitions and the converted schema.

You will then pass the shape type of a shape definition to the ng sdk:

```ts
import { useShape } from "@ng-org/orm/react";
import { TestObjectShapeType } from "../shapes/orm/testShape.shapeTypes";

export function TestComponent() {
    const testObjects = useShape(TestObjectShapeType);
    ...
}
```

For an example, see the [multi-framework-signals example application](../examples/multi-framework-signals/README.md).

## Generated Output

For each SHEX file, the tool creates three TypeScript files:

- A schema file like `person.schema.ts`
- A typings file like `person.typings.ts`
- A shape type file like `person.shapeTypes.ts` which contains a `ShapeType` that consists of the schema, the type, and the IRI of the main shape

The transformers for converting SHEX to schema and typings files are based on `@ldo/traverser-shexj`.

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
                dataTypes: [
                    {
                        valType: "literal",
                        literals: ["http://example.org/Person"],
                    },
                ],
                maxCardinality: -1,
                minCardinality: 1,
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                readablePredicate: "@type",
                // `extra` here allows additional type values along with `http://example.org/Person`.
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
                // `extra` here enables that if multiple children are present but only one is valid, the shape is still considered valid.
                extra: true,
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

#### Readable Predicate Names

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

#### Standard Properties

- **`@type`**: The RDF type IRI (from `rdf:type`) is always converted to the property name `@type` by default
- **`@id` and `@graph`**: These properties are automatically added to all typed objects as readonly properties

### Cardinality Handling

Predicates with a cardinality higher than 1 (i.e., `maxCardinality > 1` or `maxCardinality === -1` for unlimited) are represented as TypeScript `Set<T>` types.

---

## NextGraph

> NextGraph brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info here [https://nextgraph.org](https://nextgraph.org)

## Support

Documentation can be found here [https://docs.nextgraph.org](https://docs.nextgraph.org)

And our community forum where you can ask questions is here [https://forum.nextgraph.org](https://forum.nextgraph.org)

## License

3 files have been taken from LDO project and modified by us. 1 file has been taken from LDO project without modifications.

All from repository
https://github.com/o-development/ldo/tree/main/packages/schema-converter-shex
at commit c461beb5a5acf379d3069f0734dfa5d57fd20eaa (Aug 23, 2025) licensed under MIT License with copyright attribution to : Copyright (c) 2023 Jackson Morgan.
Those 4 files are here relicensed under Apache 2.0 and MIT.

All subsequent commits on those files, and any other file in this package are licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
  at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

### Contributions license

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you shall be dual licensed as below, without any
additional terms or conditions.

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.

[license-image]: https://img.shields.io/badge/license-Apache2.0-blue.svg
[license-link]: https://git.nextgraph.org/NextGraph/nextgraph-rs/raw/branch/master/LICENSE-APACHE2
[license-image2]: https://img.shields.io/badge/license-MIT-blue.svg
[license-link2]: https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/LICENSE-MIT
