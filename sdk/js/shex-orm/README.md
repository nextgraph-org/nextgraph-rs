# Schema Converter SHEX > TypeScript

CLI tool to convert SHEX shapes to schemas and TypeScript definitions ("shape types") that can be used for creating RDF ORM objects.

You need this utility for compiling schemas for use with the [TypeScript RDF ORM](https://docs.nextgraph.org/en/reference/orm/).

## Reference documentation

[Reference documentation is available here on docs.nextgraph.org](https://docs.nextgraph.org/en/reference/shex-orm/).

## About RDF

[RDF (Resource Description Framework)](https://en.wikipedia.org/wiki/Resource_Description_Framework) is a standard to describe data. Rather than organizing data as tables (e.g. SQL) or trees (e.g. JSON), RDF represents data as a non-hierarchical, unstructured set of triples (a graph aka network).

Each triple consists of a _subject_ (about which you are describing something), a _predicate_ (the property of the relationship, e.g. the first name), and an _object_ (the value of that property or a reference). Triples belong to documents, also called _graphs_ in the context of RDF. Subjects, predicates and graphs are all _IRIs_ (the generalization of URLs). There are many specifications for describing data, to aid application interoperability.

RDF's flexible and schema-less design aids in schema-evolution, interoperability, and data relationships.
You are advised to take a moment to get yourself familiar with RDF if you are new to it.

To work with RDF in applications and bring structure to it, you need to define schemas.

**Schemas define what data you want to query, validate, and see materialized in a TypeScript object.**

## Setup

Install `@ng-org/shex-orm` as dev dependency.

```bash
npm install --save-dev @ng-org/shex-orm
```

Then run

```bash
npx rdf-orm build --input ./src/shapes/shex --output ./src/shapes/orm
```

In your app's `package.json`, you are advised to add something like the following:

```json
{
    "scripts": {
        "build:orm": "rdf-orm build --input ./src/shapes/shex --output ./src/shapes/orm",
        "dev": "npm run build:orm && vite dev",
        "build": "npm run build:orm && vite build"
    }
}
```

## Writing SHEX Schemas

Below, you can see an example SHEX schema as an orientation. You can also check out the [SHEX schema of an example app](https://git.nextgraph.org/NextGraph/expense-tracker-graph/src/branch/main/src/shapes/shex/expenseShapes.shex).

```shex
PREFIX ex: <did:ng:z:>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

ex:ExpenseShape {
  # `a` is a shorthand for the standard RDF type predicate `rdfs:type` or in the long form: `http://www.w3.org/1999/02/22-rdf-syntax-ns#type`
  a [ex:Person]                    # Required type <did:ng:z:Person>
      // rdfs:comment "This is a comment that will appear in the generated TypeScript type" ;
  ex:name xsd:string ;             # Required string
  ex:email xsd:string * ;          # Zero or more strings (set)
  ex:height xsd:float ;            # Required number
  ex:age xsd:integer ;             # Required integer. NOTE: TS does not support integers and you are recommended to use xsd:float unless you know what you are doing.
  ex:friends IRI * ;               # Set of IRIs
  ex:isRecurring xsd:boolean ;     # A boolean value
  ex:address @ex:AddressShape ;    # A nested object shape.
  ex:paymentStatus [ex:Paid ex:Pending ex:Overdue] ; # Enum
}

# `EXTRA a` means that the property `a` may have other values in addition to `ex.Address`
ex:AddressShape EXTRA a {
  a [ ex:Address ] ;
  ex:name xsd:string ;
}
```

See [what output was generated below](#generated-output).

**SHEX Quick Reference**

| Syntax                             | Meaning                              | TypeScript Type            |
| ---------------------------------- | ------------------------------------ | -------------------------- |
| `prop xsd:string`                  | Required, exactly one                | `string`                   |
| `prop xsd:boolean ?`               | Optional, zero or one                | `boolean \| undefined`     |
| `prop xsd:float *`                 | Zero or more                         | `Set<number>`              |
| `prop xsd:string +`                | One or more                          | `Set<string>` (non-empty)  |
| `prop IRI`                         | Reference to another object          | `string` (IRI)             |
| `@ex:PersonShape`                  | nested object                        | `Person`                   |
| `prop xsd:string OR xsd:float`     | multiple types allowed               | `string \| number`         |
| `@ex:AudioAsset OR @ex:VideoAsset` | multiple nested object types allowed | `AudioAsset \| VideoAsset` |

You will then pass the shape type of a shape definition to the ng sdk:

Note: If you specify more than one allowed nested shape and the data matches both shapes, the first shape will "win". In general though, you are advised to define shapes so that this does not happen. Specify different types for each shape instead (e.g. `a [ex:DistinguishingTypeOnlyAvailableInThisData] ;`).

## Generated Output

For each SHEX file, the tool creates three TypeScript files:

- A schema file like `person.schema.ts`
- A typings file like `person.typings.ts`
- A shape type file like `person.shapeTypes.ts` which contains a `ShapeType` that consists of the schema, the type, and the IRI of the main shape. This is what you pass to the ORM.

The transformers for converting SHEX to schema and typings files are based on `@ldo/traverser-shexj`.

### Representation in TypeScript

Every type has the following two readonly properties:

- `@id` the subject IRI
- `@graph` the graph (document) NURI

In addition to that you will usually find the **`@type`** property: The RDF type IRI (from `rdfs:type`) is always converted to the property name `@type` by default. You are strongly encouraged to specify a type in your schema.

Property names are derived of the last part of the predicate IRI. In case of name collisions the 2nd, 3rd, etc. last part is used added as well.

Predicates with a cardinality higher than 1 (i.e., `maxCardinality > 1` or `maxCardinality === -1` for unlimited) are represented as TypeScript `Set<T>` types. Note that SHEX allows you to specify cardinalities not representable in TypeScript, for example greater than 2 and less than 4. When you modify an object so that it does not fulfil those requirements anymore, it will disappear since it doesn't match the shape anymore.

Currently all RDF types are mapped to string, number, or boolean, including date which is mapped to an ISO 8601 date string.

### Use in the ORM

In the ORM, you pass the generated `ShapeType` to the respective functions (`getObjects()`, `insertObject()`, `useShape()`, `OrmSubscription.getOrCreate()`), for example:

```ts
import { useShape } from "@ng-org/orm/react";
import { TestObjectShapeType } from "../shapes/orm/testShape.shapeTypes";

export function TestComponent() {
    const {data: testObjects} = useShape(TestObjectShapeType, {graphs: ["did:ng:i"]});
    ...
}
```

## Nested Object Validity

Note that when a nested object is invalid, the whole parent object is invalid too (i.e. it won't be loaded).
If you want to allow for invalid children (that are then not materialized in TypeScript), you can mark the property as EXTRA, e.g.:

```shex
ex:ExpenseShape EXTRA ex:address {
  ex:address @ex:AddressShape ;
}
```

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

```

```
