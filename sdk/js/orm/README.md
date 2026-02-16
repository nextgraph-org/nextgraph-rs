# NextGraph ORM SDK

Reactive ORM library for NextGraph: use reactive (typed) objects that automatically sync to NextGraph's encrypted, local-first storage.

For a walk-through you can see the the expense-tracker example apps for [discrete JSON documents](https://git.nextgraph.org/NextGraph/expense-tracker-discrete) or [typed graph documents](https://git.nextgraph.org/NextGraph/expense-tracker-graph).

## Why?

Different CRDTs have different APIs. We want to make it as easy as possible to use them in the same way:\
**You modify a plain old TypeScript object and that updates the CRDT.**\
Vice versa, the CRDT is modified and that is reflected in your TS object.\
We offer this for **React, Vue, and Svelte**.

Note that we support discrete (**JSON**) CRDT and graph (**RDF**) CRDT ORMs.

- For graphs, you specify a schema using a SHEX shape and optionally a scope. This provides you with typing support.
- For discrete CRDTs, all you need is a document id.

## Table of Contents

- [NextGraph ORM SDK](#nextgraph-orm-sdk)
  - [Why?](#why)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Start](#start)
  - [Graph ORM: Defining Schemas](#graph-orm-defining-schemas)
  - [Framework Usage](#framework-usage)
    - [React](#react)
    - [Vue](#vue)
    - [Svelte](#svelte)
  - [Working with Data](#working-with-data)
    - [Adding Objects](#adding-objects)
    - [Modifying Objects](#modifying-objects)
    - [Deleting Objects](#deleting-objects)
    - [Working with Sets](#working-with-sets)
    - [Relationships](#relationships)
  - [About NextGraph](#about-nextgraph)
  - [License](#license)

---

## Installation

```bash
pnpm add @ng-org/orm @ng-org/web @ng-org/alien-deepsignals
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
        // The ORM needs to have access to ng, the interface to the engine running in WASM.
        initNg(ng, event.session);
    },
    true,
    []
);
```

Then use `useShape()` for graph, or `useDiscrete()` for discrete documents.

In some cases, you may want to use advanced features managing subscriptions with the engine.
For that, you can directly use:

- `OrmConnection.getOrCreate(ShapeType, scope)` for graphs
- `DiscreteOrmConnection.getOrCreate(documentId)` for discrete documents

Internally, the OrmConnection keeps a signalObject, a proxied, reactive object. When modifications are made, this makes the frontend components rerender and sends the update to the engine to be persisted.
In all cases, you have to create a document first with `ng.doc_create()`. For more details, you can consult the example apps and the inline jsdoc documentation.

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

## Framework Usage

### React

```tsx
import { useShape } from "@ng-org/orm/react";
import { DogShapeType } from "./shapes/orm/dogShape.shapeTypes";
import type { Dog } from "./shapes/orm/dogShape.typings";

export function DogList() {
    const dogs = useShape(DogShapeType); // DeepSignalSet<Dog>

    return (
        <ul>
            {[...dogs].map((dog) => (
                <li key={dog["@id"]}>
                    {/* Direct mutation triggers re-render */}
                    <input
                        value={dog.name}
                        onChange={(e) => (dog.name = e.target.value)}
                    />
                </li>
            ))}
        </ul>
    );
}
```

> **Note**: No `setState` needed — just mutate the object directly.

### Vue

**Parent component** (`DogList.vue`):

```vue
<script setup lang="ts">
import { useShape } from "@ng-org/orm/vue";
import { DogShapeType } from "./shapes/orm/dogShape.shapeTypes";
import DogCard from "./DogCard.vue";

const dogs = useShape(DogShapeType); // DeepSignalSet<Dog>
</script>

<template>
    <DogCard v-for="dog in dogs" :key="dog['@id']" :dog="dog" />
</template>
```

**Child component** (`DogCard.vue`):

```vue
<script setup lang="ts">
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";
import type { Dog } from "./shapes/orm/dogShape.typings";

const props = defineProps<{ dog: Dog }>();

// Required for reactivity in child components!
const dog = useDeepSignal(props.dog);
</script>

<template>
    <div>
        <input v-model="dog.name" />
    </div>
</template>
```

> **Important**: In Vue child components, wrap props with `useDeepSignal()` to enable reactivity.

### Svelte

```svelte
<script lang="ts">
    import { useShape } from "@ng-org/orm/svelte";
    import { DogShapeType } from "./shapes/orm/dogShape.shapeTypes";

    const dogs = useShape(DogShapeType); // Reactive store
</script>

<ul>
    {#each [...$dogs] as dog (dog["@id"])}
        <li>
            <input bind:value={dog.name} />
        </li>
    {/each}
</ul>
```

> **Note**: Access the store value with `$dogs`. Standard Svelte binding works.

---

## Working with Data

### Adding Objects

To add a new object, you need a document IRI (`@graph`). Create a document first:

```typescript
import { sessionPromise } from "./utils/ngSession";

const session = await sessionPromise;

// Create a new NextGraph document
const docIri = await session.ng.doc_create(
    session.session_id,
    "Graph",
    "data:graph",
    "store",
    undefined
);

// Add to the reactive set
dogs.add({
    "@graph": docIri, // Required: document IRI
    "@type": "http://example.org/Dog", // Required: RDF type
    "@id": "", // Empty = auto-generate subject IRI
    name: "Buddy",
    age: 3,
    toys: new Set(["ball", "rope"]),
});
```

> **Note**: For nested sub-objects, `@graph` is optional — the parent's graph IRI is used.
>
> **Note**: If you want to use the ORM signal object in a non-component context, you can create an ORM connection manually using `OrmConnection.getOrCreate()`.

### Modifying Objects

Simply assign new values:

```typescript
dog.name = "Max";
dog.age = 4;
```

Changes are:

- Immediately reflected in all components using the same shape
- Automatically persisted to NextGraph storage
- Synced to other devices in real-time

### Deleting Objects

```typescript
dogs.delete(dog);
```

### Working with Sets

Properties with SHEX cardinality `*` or `+` become reactive Sets:

```typescript
// Add items
dog.toys.add("frisbee");

// Remove items
dog.toys.delete("ball");

// Check membership
if (dog.toys.has("rope")) { ... }

// Iterate
for (const toy of dog.toys) {
    console.log(toy);
}

// Get size
console.log(dog.toys.size);

// NOTE: For ES2025 environment, set iterator objects are directly attached:
dogs.forEach((dog) => {
    console.log(dog.toys.size);
});
```

### Relationships

Link objects by storing the target's `@id` IRI:

```typescript
// In your SHEX schema:
// ex:owner IRI ;

// Link to another object
dog.owner = person["@id"];

// Resolve the relationship
const owner = people.find((p) => p["@id"] === dog.owner);
```

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
