# NextGraph ORM SDK

Reactive ORM library for NextGraph: use reactive (typed) objects that automatically sync to NextGraph's encrypted, local-first storage.

For a walk-through you can see the the expense-tracker example apps for [discrete JSON documents](https://git.nextgraph.org/NextGraph/expense-tracker-discrete) or [typed graph documents](https://git.nextgraph.org/NextGraph/expense-tracker-graph).

## Reference documentation

[Reference documentation is available here on docs.nextgraph.org](https://docs.nextgraph.org/en/reference/orm/).

## Why?

Different CRDTs have different APIs. We want to make it as easy as possible to use them in the same way:\
**You modify a plain old TypeScript object and that updates the CRDT.**\
Vice versa, the CRDT is modified and that is reflected in your TS object.\
We offer this for **React, Vue, and Svelte**.

Note that we support discrete (**JSON**) CRDT and graph (**RDF**) CRDT ORMs.

- For graphs, you specify a schema using a SHEX shape and optionally a scope. This provides you with typing support.
- For discrete CRDTs, all you need is a document ID (NURI).

## Table of Contents

- [Installation](#installation)
- [Start](#start)
- [Graph ORM: Defining Schemas](#graph-orm-defining-schemas)
- [Frontend Framework Usage](#frontend-framework-usage)
- [Working with Data](#working-with-data)
    - [Creating a Document](#creating-a-document)
    - [Using and Modifying ORM Objects](#using-and-modifying-orm-objects)
        - [Graph ORM: Relationships](#graph-orm-relationships)

---

## Installation

```bash
pnpm add @ng-org/orm @ng-org/web
```

For schema generation, also install:

```bash
pnpm add -D @ng-org/shex-orm
```

---

## Start

You are strongly advised to look at the example apps for [discrete JSON documents](https://git.nextgraph.org/NextGraph/expense-tracker-discrete) and [typed graph documents](https://git.nextgraph.org/NextGraph/expense-tracker-graph).

Before using the ORM, initialize NextGraph in your app entry point:

```typescript
import { ng, init } from "@ng-org/web";
import { initNg } from "@ng-org/orm";

await init(
    async (event) => {
        // The ORM needs to have access to ng,
        // the interface to the engine running in WASM.
        initNg(ng, event.session);
    },
    true,
    []
);
```

Then use `useShape()` for graphs, or `useDiscrete()` for discrete documents.

In some cases, you may want to use advanced features managing subscriptions with the engine.
With an OrmSubscription, you can manage things like transactions manually.
This is useful for example when you want to manage a state across components.
See [`OrmSubscription.getOrCreate(ShapeType, scope)`](#getorcreate-1) for graphs
and [`DiscreteOrmSubscription.getOrCreate(documentId)`](#getorcreate) for discrete documents.

Internally, the OrmSubscription keeps a signalObject, a proxied, reactive object. When modifications are made, this makes the frontend components rerender and sends the update to the engine to be persisted.

In all cases, you have to create a document first with `ng.doc_create()`.

## Graph ORM: Defining Schemas

Define your data model using [SHEX (Shape Expressions)](https://shex.io/):
See [@ng-org/shex-orm](../shex-orm/README.md) for details.

**`shapes/shex/dogShape.shex`**:

```shex
PREFIX ex: <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

ex:Dog {
    a [ex:Dog] ;
    ex:name xsd:string ;
    ex:age xsd:integer ? ;
    ex:toys xsd:string * ;
}
```

Generate TypeScript types. Add the following to your `package.json` scripts and run `build:orm`:

```json
"build:orm": "rdf-orm build --input ./src/shapes/shex --output ./src/shapes/orm"
```

## Frontend Framework Usage

The SDK offers hooks for discrete and graph-based CRDTs for Svelte, Vue and React:

- discrete CRDTs for
    - Svelte 5: [useDiscrete](#svelteusediscrete)
    - Svelte 3/4: [useDiscrete](#svelte4usediscrete)
    - Vue: [useDiscrete](#vueusediscrete)
    - React: [useDiscrete](#reactusediscrete)
- graph CRDTs for:
    - Svelte 5: [useShape](#svelteuseshape)
    - Svelte 3/4: [useShape](#svelte4useshape)
    - Vue: [useShape](#vueuseshape)
    - React: [useShape](#reactuseshape)

All of them have the same logic. They create a 2-way binding to the engine.
You can modify the returned object like any other JSON object. Changes are immediately
reflected in the CRDT and the components rerender.
When the component unmounts, the subscription is closed.

```ts
// Queries the graphs with NURI did:ng:o:g1 and did:ng:o:g2 and with subject s1 or s2.
const expenses: DeepSignal<Set<Expense>> = useShape(ExpenseShapeType, {
    graphs: ["did:ng:o:g1", "did:ng:o:g2"],
    subjects: ["<s1 IRI>", "<s2 IRI>"],
});

// Use expenses in your component
// and modify them to trigger a rerender and persist them.
// ...
```

---

## Working with Data

The ORM is designed to make working with data as normal as possible.
You get an object as you are used to it and when you change properties,
they are automatically persisted and synced with other devices. Conversely,
modifications arrive at the ORM objects immediately and your components rerender.

### Creating a Document

First, you need a document to store and get your data.
With the document NURI, you can then create ORM objects.

```ts
// Create a new NextGraph document
const docNuri = await ng.doc_create(
    session_id,
    "Graph", // Or "YMap" or "Automerge", for discrete
    "data:graph", // Or "data:json" : "data:map" for Automerge or YJs
    "store",
    undefined
);

// Add class to RDF part of the document so we can find it again.
await ng.sparql_update(
    session_id,
    `INSERT DATA { GRAPH <${documentId}> {<${documentId}> a <${APPLICATION_CLASS_IRI}> } }`,
    documentId
);
```

To find your document, you can make a sparql query as well:

```ts
const ret = await ng.sparql_query(
    session_id,
    `SELECT ?storeId WHERE { GRAPH ?storeId { ?s a <${APPLICATION_CLASS_IRI}> } }`,
    undefined,
    undefined
);
let documentId = ret?.results.bindings?.[0]?.storeId?.value;
```

### Using and Modifying ORM Objects

There are multiple ways to get and modify data:

- Get and modify the data returned by a `useShape()` or `useDiscrete()` hook inside a component.
- Get and modify the signalObject of the subscription returned by `Orm(Discrete)Subscription.getOrCreate()`.
- For graph ORMs: Call [`insertObject()`](#insertobject) or [`getObjects`](#getobjects) (no 2-way binding).

```typescript
const dogSubscription = OrmSubscription.getOrCreate(DogShape, {
    graphs: [docNuri],
});
await dogSubscription.readyPromise;

// If we used OrmDiscreteSubscription, the signalObject type would be array or object.
const dogSet: DeepSignal<Set<Dog>> = dogSubscription.signalObject;

dogs.add({
    // Required: The document NURI. May be set to `""` for nested objects (will be inherited from parent object then).
    "@graph": docNuri,
    "@type": "did:ng:x:Dog", // Required: RDF type
    "@id": "", // Empty string = auto-generate subject IRI
    name: "Mr Puppy",
    age: 2,
    toys: new Set(["ball", "rope"]),
});

// When you know that only one element is in the set, you can call `.first()` to get it.
const aDog = dogs.first();
aDog.age += 1;
aDog.toy.add("bone");

// Utility to find objects in sets:
const sameDog = dogs.getBy(aDog["@graph"], aDog["@id"]);
// sameSog === aDog.

dogs.delete(aDog);
```

Note that the graph CRDT supports sets only, the discrete CRDTs arrays only.

#### Graph ORM: Relationships

To reference external objects, you can use their `@id`.

```typescript
casey.friends.add(jackNuri);

// When the child object is a nested object that you do not have in memory,
// you can establish the link by adding an object that contains the `@id` property only.
shoppingExpense.category.add({ "@id": "<Subject IRI of expense category>" });
// Link objects by storing the target's `@id` NURI/IRI:

dog.owner = jackNuri;
// Resolve the relationship
const jack = people.find((p) => p["@id"] === dog.owner);
```

Note that when you delete a nested object from a parent, _only the linkage_ to it is removed. The nested object itself (its quads) are not deleted.

---

## About NextGraph

> **NextGraph** brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy.
>
> Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info: [https://nextgraph.org](https://nextgraph.org)

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme.
