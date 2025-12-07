# @ng-org/signals

Reactive ORM library for NextGraph — use typed, reactive objects that automatically sync to NextGraph's encrypted, local-first storage.

For a walk-through, you can see the the [expense-tracker example app](https://git.nextgraph.org/NextGraph/expense-tracker) which shows

- React, Vue, and Svelte frontends sharing data
- SHEX schema definitions
- CRUD operations
- Cross-framework real-time sync

## Table of Contents

- [@ng-org/signals](#ng-orgsignals)
    - [Table of Contents](#table-of-contents)
    - [Installation](#installation)
    - [Quick Start](#quick-start)
    - [Defining Schemas](#defining-schemas)
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
    - [API Reference](#api-reference)
        - [`useShape(shapeType)`](#useshapeshapetype)
        - [Shared State](#shared-state)
    - [License](#license)

---

## Installation

```bash
pnpm add @ng-org/signals @ng-org/web @ng-org/alien-deepsignals
```

For schema code generation, also install:

```bash
pnpm add -D @ng-org/shex-orm
```

---

## Quick Start

Before using the ORM, initialize NextGraph in your app entry point:

```typescript
import { ng, init } from "@ng-org/web";
import { initNg } from "@ng-org/signals";

await init(
    async (event) => {
        initNg(ng, event.session);
    },
    true,
    []
);
```

Then use `useShape()` in your components:

```typescript
import { useShape } from "@ng-org/signals/react"; // or /vue, /svelte
import { DogShapeType } from "./shapes/orm/dogShape.shapeTypes";

const dogs = useShape(DogShapeType);

// Iterate, modify, add — changes auto-sync everywhere
for (const dog of dogs) {
    console.log(dog.name);
}
```

---

## Defining Schemas

Define your data model using [SHEX (Shape Expressions)](https://shex.io/):

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

This creates:

- `dogShape.typings.ts` — TypeScript interfaces
- `dogShape.shapeTypes.ts` — Shape type objects for `useShape()`
- `dogShape.schema.ts` — Internal schema metadata

See [@ng-org/shex-orm](../shex-orm/README.md) for full documentation.

---

## Framework Usage

### React

```tsx
import { useShape } from "@ng-org/signals/react";
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

In component `DogManager.vue`

```vue
<script setup lang="ts">
import { DeepSignal } from "@ng-org/alien-deepsignals";
import DogComponent from "./Dog.vue";
import { Dog } from "./types.ts";
import { useShape } from "@ng-org/signals/vue";
import { DogShapeType } from "./shapes/orm/dogShape.shapeTypes";
import DogCard from "./DogCard.vue";

const dogs: DeepSignal<Dog> = useShape(DogShapeType);
</script>

<template>
    <DogComponent v-for="dog in dogs" :key="dog.id" :dog="dog" />
</template>
```

In a child component, `Dog.vue`. Note that you need to use `useDeepSignal`, to gain reactivity.

```vue
<script setup lang="ts">
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";

const props = defineProps<{
    dog: DeepSignal<Dog>;
}>();

// Important!
// In vue child components, you need to wrap deepSignal objects into useDeepSignal hooks, to ensure the component re-renders.
const dog = useDeepSignal(props.dog);
</script>
<template>
    {{ dog.name }}
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
    import { useShape } from "@ng-org/signals/svelte";
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
> **Note**: If you want to use the ORM signal object in a non-component context, you can use `createSignalObjectForShape` function as well.

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

## API Reference

### `useShape(shapeType)`

Returns a `DeepSignalSet<T>` containing all objects of the given shape type.

```typescript
const dogs = useShape(DogShapeType);
```

**DeepSignalSet methods:**

- `add(obj)` — Add a new object
- `delete(obj)` — Remove an object
- `has(obj)` — Check if object exists
- `size` — Number of objects
- `getBy(graphIri, subjectIri)` — Find object by IRIs
- `[Symbol.iterator]` — Iterate with `for...of` or spread `[...set]`
- ... and all symbol iterator helper methods (like `.map`, `.find`, ...), if you are in an ES2025+ environment.

### Shared State

When `useShape()` is called with the same shape type and scope in multiple components, they share the exact same reactive data. Changes in one component instantly appear in all others.

---

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme.
