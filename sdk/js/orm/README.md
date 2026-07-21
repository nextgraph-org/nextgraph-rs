# NextGraph ORM SDK

Reactive ORM library for NextGraph: use reactive (typed) objects that automatically sync to NextGraph's encrypted, local-first storage.

For a walk-through you can see the the expense-tracker example apps for [JSON documents](https://git.nextgraph.org/NextGraph/expense-tracker-discrete) or [typed graph documents](https://git.nextgraph.org/NextGraph/expense-tracker-graph).

Note that there are two variants of the SDK:

- The RDF ORM for working with **RDF** (graph) data (good for interoperability, cross-document data, evolving schemas)
- The discrete ORM for working discrete (single-document) **JSON-based** CRDTs: Automerge & YJS currently supported (you need to enforce the schema in the code yourself)

The SDK is reactive. Modifications to your received "plain old TypeScript objects" are **instantly synced with the database and other devices**.\
Vice versa, when the data is modified on a different device, that is reflected in your TS object and your frontend rerenders the data.\
We offer frontend framework support for **React, Vue, and Svelte (5 and 4)** but you can use the SDK without a frontend framework as well.

## Reference documentation

[Reference documentation is available here on docs.nextgraph.org](https://docs.nextgraph.org/en/reference/orm/).

## Table of Contents

- [NextGraph ORM SDK](#nextgraph-orm-sdk)
    - [Reference documentation](#reference-documentation)
    - [Table of Contents](#table-of-contents)
    - [Example Apps](#example-apps)
    - [Installation](#installation)
    - [Initializing NextGraph in Your App](#initializing-nextgraph-in-your-app)
    - [RDF (Graph) ORM](#rdf-graph-orm)
        - [About RDF](#about-rdf)
        - [Creating an RDF Document](#creating-an-rdf-document)
        - [Defining a Schema](#defining-a-schema)
        - [Using and Modifying RDF ORM Objects](#using-and-modifying-rdf-orm-objects)
        - [RDF ORM: Frontend Framework Integration](#rdf-orm-frontend-framework-integration)
        - [Scopes for Retrieving Data](#scopes-for-retrieving-data)
        - [Relationships](#relationships)
        - [Ordering](#ordering)
        - [Pagination](#pagination)
        - [The RdfOrmSubscription Class](#the-rdformsubscription-class)
        - ["Disappearing" Objects](#disappearing-objects)
    - [Discrete (JSON-based) ORM](#discrete-json-based-orm)
        - [Creating an Automerge or YJS Document](#creating-an-automerge-or-yjs-document)
        - [The DiscreteOrmSubscription Class](#the-discreteormsubscription-class)
    - [Transactions](#transactions)
    - [Reactive Objects: The `DeepSignal<>` Type](#reactive-objects-the-deepsignal-type)
        - [Signal Objects in Frontend Frameworks](#signal-objects-in-frontend-frameworks)
    - [About NextGraph](#about-nextgraph)
    - [License](#license)

---

## Example Apps

Before writing your own app, you are strongly advised to look at the example apps below, where you can find walkthroughs for different framework and crdt-specific walkthroughs.

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

The app looks the same in all implementations. You can see that the `useShape()` and `useDiscrete()` frontend hooks that retrieve the data share the same syntax across all frameworks.

## Installation

```bash
npm install @ng-org/orm @ng-org/web

```

For schema generation for the RDF ORM, also install:

```bash
npm install --save-dev @ng-org/shex-orm
```

## Initializing NextGraph in Your App

Before using the ORM, initialize NextGraph in your app entry point:

```typescript
import { ng, init } from "@ng-org/web";
import { initNg } from "@ng-org/orm";

// Call init as early as possible when your app loads.
// At the first call, it will redirect the user to login with their wallet.
// In that case, there is no need to render the rest of the app.
// When the wallet is opened, your app will start in an iframe.
// The call to init then connects the interface to the engine.
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

## RDF (Graph) ORM

The ORM is designed to make working with RDF as "normal" as possible.
You get an object as you are used to it and when you change properties,
they are automatically persisted and synced with other devices. Conversely,
modifications coming from other devices update the ORM objects too and your frontend components refresh.

### About RDF

[RDF (Resource Description Framework)](https://en.wikipedia.org/wiki/Resource_Description_Framework) is a standard to describe data. Rather than organizing data as tables (e.g. SQL) or trees (e.g. JSON), RDF represents data as a non-hierarchical, unstructured set of triples (a graph aka network).

Each triple consists of a _subject_ (about which you are describing something), a _predicate_ (the property of the relationship, e.g. the first name), and an _object_ (the value of that property or a reference). Triples belong to documents, also called _graphs_ in the context of RDF. Subjects, predicates and graphs are all _IRIs_ (the generalization of URLs). There are many specifications for describing data, to aid application interoperability.

RDF's flexible and schema-less design aids in schema-evolution, interoperability, and data relationships.
You are advised to take a moment to get yourself familiar with RDF if you are new to it.

To work with RDF in applications and bring structure to it, we will define schemas to query the data below.

### Creating an RDF Document

First, you need a document to store and get your data.
With the document id (NURI), you can then create ORM objects.

```ts
// Create a new NextGraph document
const docNuri = await ng.doc_create(
    session_id,
    "Graph",
    "data:graph",
    "store",
    undefined
);

const APPLICATION_CLASS_IRI = "did:ng:z:MyApplication";

// Add a class to the document so we can find it again.
await ng.sparql_update(
    session_id,
    `INSERT DATA { GRAPH <${documentId}> {<${documentId}> a <${APPLICATION_CLASS_IRI}> } }`,
    documentId
);
```

To later find your document NURI, you make a sparql query:

```ts
const ret = await ng.sparql_query(
    session_id,
    `SELECT ?storeId WHERE { GRAPH ?storeId { ?s a <${APPLICATION_CLASS_IRI}> } }`,
    undefined,
    undefined
);
let documentId = ret?.results.bindings?.[0]?.storeId?.value;
```

### Defining a Schema

In order to work with typed data, you need to define a SHEX schema. The schema defines the properties the orm objects have and how they map to RDF.

You create those schemas with the help of `@ng-org/shex-orm`, as documented [here](https://docs.nextgraph.org/en/reference/shex-orm/).

When you followed the steps there, you will have generated so-called `ShapeType`s, one for each schema. `ShapeTypes` contain the typescript type definitions as well as the schemas. Whenever you call a method to retrieve ORM data, you pass it the `ShapeType`. The details are described below.

### Using and Modifying RDF ORM Objects

To retrieve your data, you need to create an `RdfOrmSubscription` or use a function that does that for you. The RdfOrmSubscription receives a `ShapeType` and options (scope, ordering, pagination, ...) and loads the data and keeps it in sync.

The data that you will receive is either a reactive ([`DeepSignal`](https://docs.nextgraph.org/en/reference/alien-deepsignals/)) set or a read-only reactive array (when you specified an ordering). To sets, you are allowed to add and remove items. Because order is managed by the subscription, you are not allowed to make modifications affecting adds, moves, or removes.

There are multiple ways to create a subscription and get the data (you will see examples for them in the next sections):

- Get and modify the data returned by a `useShape(shapeType, options)` hook inside of a component.
- Get and modify the signalObject of the subscription returned by [`RdfOrmSubscription.getOrCreate(shapeType, options)`](#the-rdformsubscription-class). Note that this only works for subscriptions without ordering since you are not allowed to modify the order of the items.
- No 2-way binding:
    - [`getObjects(shapeType, options)`](#getobjects) Gets all object with the given shape type within the scope specified in `options`. The returned objects are _not_ reactive (`DeepSignal`) objects - modifications to them do not trigger updates and changes from other sources do not update the returned data.
    - [`insertObject(shapeType, object)`](#insertobject): A convenience function to add objects of a given shape to the database without sustaining an OrmSubscription.

### RDF ORM: Frontend Framework Integration

The SDK offers hooks for the following frameworks:

- Svelte 5: [useShape](#svelteuseshape)
- Svelte 4: [useShape](#svelte4useshape)
- Vue: [useShape](#vueuseshape)
- React: [useShape](#reactuseshape)

All of them share the same logic. They create a 2-way binding to the engine.
You can modify the returned object like any other JSON object. Changes are immediately
reflected in the database and components refresh on affecting changes.
When the component unmounts, the subscription is closed.

```ts
// Queries the graphs with NURI did:ng:o:g1 and did:ng:o:g2 and with subject s1 or s2.
const expenses = useShape(ExpenseShapeType, {
    graphs: ["did:ng:o:g1", "did:ng:o:g2"],
    subjects: ["<s1 IRI>", "<s2 IRI>"],
    orderBy: undefined, // One or more properties to order by.
    pageSize: 0, // No pagination.
    maxActivePages: 0, // In case of pagination, how many to hold loaded at once (0 = no limit).
});
// Note: While the returned `expenses` object has type `DeepSignal<Set<Expense>>`, you can treat and type it as `Set<Expense>` as well, for convenience.

// Now you can use expenses in your component
// and modify them to persist them and trigger a refresh.
```

### Scopes for Retrieving Data

The RDF ORM lets you retrieve data across different documents using the `graphs` parameter in the options, as you can see in the example above.

If you want to query across all datasets, use the following Nuri: `"did:ng:i"` or simply use `""`.

When you specify one or more subject IRIs in the options, only those subject will be considered for your request (those will be queried across all graphs specified).
Because not all objects with the specified subject IRIs might match the shape you provided, some returned objects might be missing from the subject IRIs of your request.

### Relationships

To reference external objects, you can use their `@id`.

```typescript
// Note that jackIri is the subject IRI of an object that describes Jack.
const jackIri = ...;

casey.friends.add(jackIri);

// When the child object is a nested object that you do not have in memory,
// you can establish the link by adding an object that contains the `@id` property only.
shoppingExpense.category.add({ "@id": "<Subject IRI of expense category>" });

// Or if the property has cardinality 1, set it like this:
dog.owner = jackIri;

// Resolve the relationship
const jack = people.find((p) => p["@id"] === dog.owner);
```

Note that when you delete a nested object from a parent, _only the linkage_ to it is removed. The nested object itself (its quads) are not deleted.

Note that it is highly recommended to keep _subject IRIs globally unique_. This is not a requirement by RDF and there are certain use cases where it makes sense but generally, you are discouraged to do so. When you create a new object, you are not required to specify the subject IRI (leave the `@id` property undefined or `""`). In that case, the subscription generates a unique one. The `@id` is generated while you attach a new object to the subscription's data so you can use it immediately after that.

### Ordering

With the RDF ORM, you can specify an `orderBy` property in the options objects passed to `getObjects()`, `useShape()`, or `RdfOrmSubscription.getOrCreate()`.

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

const contacts: DeepSignal<ReadOnlyArray<Contact>> =
    contactsSubscription.signalObject;

console.log(
    "I have the following contacts in my document, ordered by last name, first name and birth date:"
);
for (contact of contacts) {
    console.log(contact);
}
```

Note that you cannot add, move, or remove items in the returned array. This logic is maintained internally. You can however change the items themselves.
If you want to add an item, you can call [`insertObject()`](#insertobject) instead which will make the item appear in the array (unless in simple pagination mode, see below). Use [`removeObject()`](#removeobject) for removing an object. If you want to modify the position, just modify the properties that the data is ordered by and it will update itself.

### Pagination

As your dataset grows loading all items matching a shape becomes computationally expensive. For that case, you are advised to use pagination.
To use pagination, you must specify an ordering as described above.

There are different modes of pagination:

- `orderedPaginatedSimple`:
  The initial data you will see is an array with as many items as was set in `pageSize`.
  By calling `nextPage()` and `previousPage()`, new items will be added to the data.

    You must set `maxActivePages` to a value greater than 0. If you set it to greater than 1, requesting the next page
    will not immediately remove the existing items in the array. Instead, only items will be removed if
    the loaded items exceed `maxActivePages` × `pageSize`.
    You are recommended to set higher values when implementing infinite feeds.

    Note that if an item becomes invalid, it will be removed from the loaded items. If however an item becomes valid that would fit in the current window by its ordering, it will not appear. Your page can shrink but not grow in size.
    As long as its ordering changes within the page bounds, it remains and changes positions.

- `orderedPaginatedCumulative`:
  This mode behaves the same as `orderedPaginatedSimple` with one difference. Because you do not set `maxActivePages`, calling `nextPage()` will not remove previously loaded data.
  Therefore you can't call `previousPage()`.

    Note that if an item becomes invalid, it will be removed from the loaded item. When an item within the loaded range becomes valid, it will appear at the correct position.

Note: When the order of an item changes to the last position of the page (or in case of `orderedPaginatedSimple` also the first), it will disappear. It is not deleted but won't be tracked because it can't be checked if it actually moved to just the position at the end/beginning of the page or beyond that.

### The RdfOrmSubscription Class

In many cases, it is enough to use `insertObject()`, `getObjects()`, and `deleteObject()` or the `useShape()` inside of a component. You can however establish a subscriptions outside of frontend components using the RdfOrmSubscription class directly using `RdfOrmSubscription.getOrCreate()` which returns an instance of the class. Once the subscription is fully established, its `.readyPromise` resolves and the `.signalObject` contains the 2-way bound data (before that, `signalObject` is defined but no data is present).

If a subscription with the same document or scope (and no pagination) exists already, a reference to that object is returned. Otherwise, a new one is created.
This pooling is especially useful when more than one frontend component subscribes to the same data and scope by calling `useShape()` or `useDiscrete()`. This reduces load and the data updates even quicker.

Subscriptions are open until `.close()` is called on all references of this object. The `useShape` hook calls `.close()` on their reference when their component unmounts. For data that you use frequently throughout the lifetime of your application, you can might want to consider creating a globally available subscription.

Example:

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

// Attention: This deletes all triples in dog's document where the subject is that of `aDog`.
// Not only the triples with predicates that are available in the loaded data.
dogs.delete(aDog);
testObjects;
```

### "Disappearing" Objects

It might happen that an object is modified in a way that makes it invalid for the ShapeType it was loaded in.
Apart from external modifications, this can happen when the schema specified cardinality constraints that are not expressible in TypeScript, e.g. less than 10 and greater than 5.
When that happens, the object disappears, i.e. is removed from the loaded data. The underlying triples are not gone though.

## Discrete (JSON-based) ORM

### Creating an Automerge or YJS Document

First, you need a document to store and get your data.
With the document id (NURI), you can then create ORM objects.

```ts
// Create a new NextGraph document
const docNuri = await ng.doc_create(
    session_id,
    "YMap", // Or "Automerge",
    "data:map", // Or "data:json" in case of Automerge
    "store",
    undefined
);

const APPLICATION_CLASS_IRI = "did:ng:z:MyApplicationWithYjs";

// Add a class to the RDF part of the document so we can find it again.
// Note: Every type of document can store RDF data.
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

### The DiscreteOrmSubscription Class

You can establish subscriptions outside of frontend components using the DiscreteOrmSubscription class. DiscreteOrmSubscriptions are scoped to one document. Once a subscription is established, its `.readyPromise` resolves and the `.signalObject` contains the 2-way bound data (before this, `signalObject` is an empty object or array).

You can create a new subscription using `DiscreteOrmSubscription.getOrCreate()`. If a subscription with the same document or scope exists already, a reference to that object is returned. Otherwise, a new one is created.
This pooling is especially useful when more than one frontend component subscribes to the same data and scope by calling `useDiscrete()`. This reduces load and the data is available instantly.

Subscriptions are open until `.close()` is called on all references of this object. The `useDiscrete` hook calls `.close()` on their reference when their component unmounts. For data that you use frequently throughout the lifetime of your application, you can might want to consider creating a globally available subscription.

## Transactions

You can start transactions with RDF and Discrete ORM subscriptions using `.beginTransaction()` and `.commitTransaction()` that both classes provide. This will delay the persistence until `.commitTransaction()` is called. Transactions do not affect updates to the frontend and incoming updates from the engine / other devices. When more than one reference to a subscription exists, the transaction affects all of them.

Note that even in non-transaction mode, changes are batched and only committed after the current task finished. The changes are sent to the engine in a [microtask](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide).

## Reactive Objects: The `DeepSignal<>` Type

Data returned by the ORM is of type `DeepSignal<T>`. It behaves like plain objects of type `T` but with some extras. Under the hood, the object is proxied. The proxy tracks modifications and will immediately update the frontend and propagate the changes to the engine.

In your code however, you _do not have to to wrap your type definitions in `DeepSignal<>`_. Nevertheless, it can be instructive for TypeScript to show you the additional utilities that DeepSignal objects expose. Also, it might keep you aware that modifications you make to those objects are persisted and that they update the frontend.
The utilities that DeepSignal objects include are:

- For sets (with the RDF ORM), you have the following extra features:
    - iterator helper methods (e.g. `map()`, `filter()`, `reduce()`, `any()`, ...)
    - `first()` to get one element from the set -- useful if you know that there is only one.
    - `getBy(graphNuri: string, subjectIri: string)`, to find objects by their graph (document) NURI and subject IRI.
    - **NOTE**: When assigning a set to `DeepSignal<Set>`, TypeScript will warn you. You can safely ignore this by writing (`parent.children = new Set() as DeepSignal<Set<any>>`). Internally, the set is automatically converted but this is not expressible in TypeScript.
- For all objects: `RAW_KEY` which gives you the non-proxied object without tracking value access and without triggering updates upon modifications. Tracking value access is used in the frontend so it knows on what changes to refresh. Modifying the raw object is not reactive. This is an _advanced feature with limited use cases (for example when you want to clone the object)_. Modifying the raw object can cause the object to get out of sync.

### Signal Objects in Frontend Frameworks

Note that you can use the reactive signal object of an orm subscription (e.g. `myOrmSubscription.signalObject`) in components too. For that, you need to use `useDeepSignal(signalObject)` from the package `@ng-org/alien-deepsignals/svelte|vue|react`. This can be useful to keep a connection open over the lifetime of a component and to avoid the delay when creating new subscriptions.

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
