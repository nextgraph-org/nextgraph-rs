# NextGraph ORM SDK

Reactive ORM library for NextGraph: use reactive (typed) objects that automatically sync to NextGraph's encrypted, local-first storage.

For a walk-through you can see the the expense-tracker example apps for [discrete JSON documents](https://git.nextgraph.org/NextGraph/expense-tracker-discrete) or [typed graph documents](https://git.nextgraph.org/NextGraph/expense-tracker-graph).

## Reference documentation

[Reference documentation is available here on docs.nextgraph.org](https://docs.nextgraph.org/en/reference/orm/).

## Why?

Different CRDTs have different APIs. We want to make it as easy as possible to use them in the same way:\
**You modify a plain old TypeScript object and that updates the CRDT.**\
Vice versa, the CRDT is modified and that is reflected in your TS object.\
We offer this for **React, Vue, and Svelte (5 and 4)**.

Note that we support single-document, discrete (**JSON**) CRDT and graph (**RDF**) CRDT data.

Because of that **there are two ORM types**:

- For RDF data (graphs), you specify a schema using a SHEX shape and optionally a scope. This provides you with typing support. Unless you specify an ordering, the items you receive are in a set, there are no arrays in RDF.
- For discrete CRDTs, all you need is a document ID (NURI).

## Table of Contents

- [NextGraph ORM SDK](#nextgraph-orm-sdk)
    - [Reference documentation](#reference-documentation)
    - [Why?](#why)
    - [Table of Contents](#table-of-contents)
    - [Installation](#installation)
    - [Start](#start)
    - [RDF (Graph) ORM: Defining Schemas](#rdf-graph-orm-defining-schemas)
    - [Frontend Framework Usage](#frontend-framework-usage)
    - [Working with Data](#working-with-data)
        - [Creating a Document](#creating-a-document)
        - [Using and Modifying ORM Objects](#using-and-modifying-orm-objects)
        - [The (Rdf|Discrete)OrmSubscription Class](#the-rdfdiscreteormsubscription-class)
        - [Transactions](#transactions)
        - [Example of using an RdfOrmSubscription](#example-of-using-an-rdformsubscription)
        - [The DeepSignal\<\> type](#the-deepsignal-type)
            - [Signal Objects in Frontend Frameworks](#signal-objects-in-frontend-frameworks)
        - [RDF (Graph) ORM: Relationships](#rdf-graph-orm-relationships)
        - [RDF (Graph) ORM: Ordering](#rdf-graph-orm-ordering)
        - [RDF (Graph) ORM: Pagination](#rdf-graph-orm-pagination)
    - [About NextGraph](#about-nextgraph)
    - [License](#license)

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

Before writing your own app, you are strongly advised to look at the example apps below, where you can find framework and crdt-specific walkthroughs.

- Discrete CRDTs
    - [all frameworks running in the same window with Astro](https://git.nextgraph.org/NextGraph/expense-tracker-discrete)
    - [Svelte 5](https://git.nextgraph.org/NextGraph/expense-tracker-discrete-svelte)
    - [Svelte 4](https://git.nextgraph.org/NextGraph/expense-tracker-discrete-svelte4) (no support for Svelte 3)
    - [Vue](https://git.nextgraph.org/NextGraph/expense-tracker-discrete-vue)
    - [React](https://git.nextgraph.org/NextGraph/expense-tracker-discrete-react)
- RDF CRDT
    - [all frameworks running in the same window with Astro](https://git.nextgraph.org/NextGraph/expense-tracker-graph)
    - [Svelte 5](https://git.nextgraph.org/NextGraph/expense-tracker-graph-svelte)
    - [Svelte 4](https://git.nextgraph.org/NextGraph/expense-tracker-graph-svelte4) (no support for Svelte 3)
    - [Vue](https://git.nextgraph.org/NextGraph/expense-tracker-graph-vue)
    - [React](https://git.nextgraph.org/NextGraph/expense-tracker-graph-react)

The app looks the same in all implementations. You can see that the `useShape()` and `useDiscrete()` frontend hooks that interact with the data, share the same syntax across all frameworks.

---

Before using the ORM, initialize NextGraph in your app entry point:

```typescript
import { ng, init } from "@ng-org/web";
import { initNg } from "@ng-org/orm";

// Call init as early as possible when your app loads.
// At the first call, it will redirect the user to login with their wallet.
// In that case, there is no need to render the rest of the app.
// Then your app will reload, and this time, this call back will be called:
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

## RDF (Graph) ORM: Defining Schemas

Define your data model using [SHEX (Shape Expressions)](https://shex.io/):
See [@ng-org/shex-orm](../shex-orm/README.md) for details.

**`shapes/shex/dogShape.shex`**:

```shex
PREFIX ex: <did:ng:z:>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

ex:Dog {
    a [ex:Dog] ;
    ex:name xsd:string ;
    ex:age xsd:integer ? ;
    ex:toys xsd:string * ;
    ex:owner IRI ? ;
}
```

Add the following to your `package.json` scripts and run `build:orm` (assuming you installed `@ng-org/shex-orm` as dev dependency):

```json
"build:orm": "rdf-orm build --input ./src/shapes/shex --output ./src/shapes/orm"
```

This will generate three files: one for TypeScript type definitions, one with generated schemas, and one that exports objects with the schema, type definition and shape name: The so called _shape types_. When you request data from the engine, you will pass a shape type in your request that defines what your object looks like.

## Frontend Framework Usage

The SDK offers hooks for discrete and graph-based CRDTs for Svelte, Vue and React:

- discrete CRDTs for
    - Svelte 5: [useDiscrete](#svelteusediscrete)
    - Svelte 4: [useDiscrete](#svelte4usediscrete)
    - Vue: [useDiscrete](#vueusediscrete)
    - React: [useDiscrete](#reactusediscrete)
- graph CRDT for:
    - Svelte 5: [useShape](#svelteuseshape)
    - Svelte 4: [useShape](#svelte4useshape)
    - Vue: [useShape](#vueuseshape)
    - React: [useShape](#reactuseshape)

All of them share the same logic. They create a 2-way binding to the engine.
You can modify the returned object like any other JSON object. Changes are immediately
reflected in the CRDT and the components refresh.
When the component unmounts, the subscription is closed.

```ts
// Queries the graphs with NURI did:ng:o:g1 and did:ng:o:g2 and with subject s1 or s2.
const expenses = useShape(ExpenseShapeType, {
    graphs: ["did:ng:o:g1", "did:ng:o:g2"],
    subjects: ["<s1 IRI>", "<s2 IRI>"],
});
// Note: While the returned `expenses` object has type `DeepSignal<Set<Expense>>`, you can treat and type it as `Set<Expense>` as well, for convenience.

// Now you can use expenses in your component
// and modify them to trigger a refresh and persist them.

// In analogy:
const expense: DeepSignal<Expense[]> = useDiscrete(expenseDocumentNuri);
// Note: While the returned `expenses` object has type `DeepSignal<Expense[]>`, you can treat and type it as `Expense[]` as well, for convenience.
```

---

## Working with Data

The ORM is designed to make working with data as normal as possible.
You get an object as you are used to it and when you change properties,
they are automatically persisted and synced with other devices. Conversely,
modifications coming from other devices update the ORM objects too and your components refresh.

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

// Add a class to the RDF part of the document so we can find it again.
await ng.sparql_update(
    session_id,
    `INSERT DATA { GRAPH <${documentId}> {<${documentId}> a <${APPLICATION_CLASS_IRI}> } }`,
    documentId
);
```

To find your document NURI, you make a sparql query:

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

- Get and modify the signalObject of the subscription returned by [`Orm(Discrete)Subscription.getOrCreate()`](#the-discreteormsubscription-class).
- Get and modify the data returned by a `useShape()` or `useDiscrete()` hook inside of a component.
- For graph ORMs (no 2-way binding):
    - [`getObjects(shapeType, scope)`](#getobjects) Gets all object with the given shape type within the `scope`. The returned objects are _not_ `DeepSignal` objects - modifications to them do not trigger updates and changes from other sources do not update the returned object.
    - [`insertObject(shapeType, object)`](#insertobject): A convenience function to add objects of a given shape to the database. While with `useShape()` and `RdfOrmSubscription`, you can just add objects to the returned set or `subscription.signalObject`, respectively.
      This function spares you of creating an `RdfOrmSubscription` and can be used outside of components, where you can't call `useShape`.

### The (Rdf|Discrete)OrmSubscription Class

You can establish subscriptions outside of frontend components using the (Discrete|Rdf)OrmSubscription class. DiscreteOrmSubscriptions are scoped to one document, RdfOrmSubscriptions can have a `Scope` of more than one document and require a shape type. Once a subscription is established, its `.readyPromise` resolves and the `.signalObject` contains the 2-way bound data.

You can create a new subscription using `(Discrete|Rdf)OrmSubscription.getOrCreate()`. If a subscription with the same document or scope exists already, a reference to that object is returned. Otherwise, a new one is created.
This pooling is especially useful when more than one frontend component subscribes to the same data and scope by calling `useShape()` or `useDiscrete()`. This reduces load and the data is available instantly.

Subscriptions are open until `.close()` is called on all references of this object. The `useShape` and `useDiscrete` hooks call `.close()` on their reference when their component unmounts.

### Transactions

To improve performance, you can start transactions with subscriptions using `.beginTransaction()` and `.commitTransaction()`. This will delay the persistence until `.commitTransaction()` is called. Transactions do not affect updates to the frontend and incoming updates from the engine / other devices. When more than one reference to a subscription exists, the transaction affects all of them.

Note that even in non-transaction mode, changes are batched and only committed after the current task finished. The changes are sent to the engine in a [microtask](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide). You can end the current task and flush, for example, by awaiting a promise: `await Promise.resolve()`.

### Example of using an RdfOrmSubscription

```typescript
const dogSubscription = RdfOrmSubscription.getOrCreate(DogShape, {
    graphs: [docNuri],
});
await dogSubscription.readyPromise;

// If we used OrmDiscreteSubscription, the signalObject type would be an array or object.
const dogSet: DeepSignal<Set<Dog>> = dogSubscription.signalObject;

dogs.add({
    // Required: The document NURI. May be set to `""` for nested objects (will be inherited from parent object then).
    "@graph": docNuri,
    "@type": "did:ng:z:Dog", // Required: RDF type
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
// sameDog === aDog.

dogs.delete(aDog);
```

Note that the RDF CRDT supports sets only, the discrete CRDTs arrays only.

### The DeepSignal<> type

Data returned by the ORM is of type `DeepSignal<T>`. It behaves like plain objects of type `T` but with some extras. Under the hood, the object is proxied. The proxy tracks modifications and will immediately update the frontend and propagate to the engine.

In your code however, you _do not have to to wrap your type definitions in `DeepSignal<>`_. Nevertheless, it can be instructive for TypeScript to show you the additional utilities that DeepSignal objects expose. Also, it might keep you aware that modifications you make to those objects are persisted and that they update the frontend.
The utilities that DeepSignal objects include are:

- For sets (with the RDF ORM):
    - iterator helper methods (e.g. `map()`, `filter()`, `reduce()`, `any()`, ...)
    - `first()` to get one element from the set -- useful if you know that there is only one.
    - `getBy(graphNuri: string, subjectIri: string)`, to find objects by their graph (document) NURI and subject IRI.
    - **NOTE**: When assigning a set to `DeepSignal<Set>`, TypeScript will warn you. You can safely ignore this by writing (`parent.children = new Set() as DeepSignal<Set<any>>`). Internally, the set is automatically converted but this is not expressible in TypeScript.
- For all objects: `__raw__` which gives you the non-proxied object without tracking value access and without triggering updates upon modifications. Tracking value access is used in the frontend so it knows on what changes to refresh. If you use `__raw__`, that won't work anymore. This is an _advanced feature with limited use cases_. Modifying the raw object can cause the object to get out of sync.

#### Signal Objects in Frontend Frameworks

Note that you can use the reactive signal object of an orm subscription (e.g. `myOrmSubscription.signalObject`) in components too. For that, you need to use `useDeepSignal(signalObject)` from the package `@ng-org/alien-deepsignals/svelte|vue|react`. This can be useful to keep a connection open over the lifetime of a component and to avoid the loading time when creating new subscriptions.

### RDF (Graph) ORM: Relationships

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

### RDF (Graph) ORM: Ordering

With the RDF ORM, you can specify an `orderBy` property in the config objects passed to `getObjects()`, `useShape()`, or `RdfOrmSubscription.getOrCreate()`.

In that case, the signal object you will receive is not a set but an array.

```ts
const contactsSubscription = RdfOrmSubscription.getOrCreate(ContactShape, {
    graphs: [contactDocNuri],
    orderBy: [
        // The key is the property name defined in the schema,
        // the value "asc" for ascending order or "desc" for descending order.
        { lastName: "asc" },
        // You can add secondary orderBy values in the array.
        { firstName: "asc" },
        { birthDate: "desc" },
    ],
});
await contactsSubscription.readyPromise;

const contacts: ReadOnlyDeepSignalArray<Contact> = dogSubscription.signalObject;

//
```

Note that you cannot add, move, or remove items in the returned array. This logic is maintained internally. You can however change the items themselves.
If you want to add an item, you can call [`insertObject()`](#insertobject) instead which will make the item appear in the array (unless in simple pagination mode, see below). Use [`removeObject()`](#removeobject) for removing an object. If you want to modify the position, just modify the properties that the data is ordered by and it will update itself.

### RDF (Graph) ORM: Pagination

When there is a lot of data that might be loaded by the ORM, you are advised to use pagination.
To use pagination, you must specify an ordering.

There are different modes of pagination:

- `orderedPaginatedSimple`:
  The initial data you will see is an array with as many items as was set in `pageSize`.
  By calling `nextPage()` and `previousPage()`, new items will be appended or prepended to the data.

    You must set `maxActivePages` to a value greater than 0. If you set it to greater than 1, requesting the next page
    will not immediately remove the existing items in the array. Instead, only items will be removed if
    the loaded items exceed `maxActivePages` × `pageSize`.
    You are recommended to set higher values when implementing infinite feeds.

    Note that if an item becomes invalid, it will be removed from the loaded items. If however an item becomes valid that would fit in the current window by its ordering, it will not appear. Your page can shrink but now grow in size.
    As long as its ordering changes within the page bounds, it remains and changes positions.

- `orderedPaginatedCumulative`:
  This mode behaves the same as `orderedPaginatedSimple` with one difference. Because you do not set `maxActivePages`, calling `nextPage()` will not remove previously loaded data.
  Therefore you can't call `previousPage()`.

    Note that if an item becomes invalid, it will be removed from the loaded item. When an item within the loaded range becomes valid, it will appear at the correct position.

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
