# Schema Converter SHEX > TypeScript

CLI tool to convert SHEX shapes to schemas and TypeScript definitions ("shape types") that can be used for creating graph ORM objects.

## How to Use

Install `@ng-org/shex-orm` as dev dependency or globally (`--global`).

```bash
npm install --save-dev @ng-org/shex-orm
```

Then run

```bash
npx rdf-orm build --input ./src/shapes/shex --output ./src/shapes/orm
```

The input directory needs to contain shex files with one or more shape definitions each, for example:

```shex
PREFIX ex: <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

ex:ExpenseShape {
  a [ex:Person] ;                            # Required type <http://example.org/Person>
  ex:name xsd:string ;                       # Required string
  ex:email xsd:string * ;                    # Zero or more strings (set)
  ex:height xsd:float ;                      # Required number
  ex:age xsd:integer ;                       # Required integer
  ex:friends IRI * ;                         # Set of IRIs
  ex:isRecurring xsd:boolean ;               # A boolean value
  ex:address @ex:AddressShape                # A nested object shape.
  ex:paymentStatus [ex:Paid ex:Pending ex:Overdue] ; # Enum
}

# In the same or another file...
ex:AddressShape EXTRA a {
  a [ ex:Address ] ;
  ex:name xsd:string ;
}
```

**SHEX Cardinality Reference**

| Syntax              | Meaning                     | TypeScript Type           |
| ------------------- | --------------------------- | ------------------------- |
| `prop xsd:string`   | Required, exactly one       | `string`                  |
| `prop xsd:string ?` | Optional, zero or one       | `string \| undefined`     |
| `prop xsd:string *` | Zero or more                | `Set<string>`             |
| `prop xsd:string +` | One or more                 | `Set<string>` (non-empty) |
| `prop IRI`          | Reference to another object | `string` (IRI)            |
| `@ex:PersonShape`   | nested object               | `Person`                  |

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

For an example, see the [expense-tracker-rdf example application](../examples/expense-tracker-rdf/README.md).

## Generated Output

For each SHEX file, the tool creates three TypeScript files:

- A schema file like `person.schema.ts`
- A typings file like `person.typings.ts`
- A shape type file like `person.shapeTypes.ts` which contains a `ShapeType` that consists of the schema, the type, and the IRI of the main shape

The transformers for converting SHEX to schema and typings files are based on `@ldo/traverser-shexj`.

#### Default Properties

- **`@type`**: The RDF type IRI (from `rdf:type`) is always converted to the property name `@type` by default
- **`@id` (subject IRI) and `@graph` (graph IRI)**: These properties are automatically added to all typed objects as readonly properties

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
