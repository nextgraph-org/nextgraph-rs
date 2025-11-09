# Reactive ORM Library for NextGraph


## How to Define Object Schemas (Shapes)

You define shapes using the shex schema. To build the typescript types and schemas you need to use the package [@ng-org/shex-orm](../shex-orm/README.md).

## How to use
Once you have a shape type, you can use it to create ORM objects. We provide hooks for react, vue, and svelte.

Just pass a shape type object to the hook and it will return proxied signal-object. They behave like regular objects
but as you make changes to the objects at any place in your code, the components will re-render accordingly.
The return type of the `useShape` hooks is `DeepSignalSet<T>`.This behaves like a regular set with two additions:
There is a utility function `getBy(graphIri, subjectIri)` and a property `$` which you can use to access the raw object.
Most probably, you will not have a use case for the latter though.

When you call `useShape` with the same shape type in different components, it will return the exactly same object.
Modifying one of them, will cause a re-render in the other components too.
Additionally, modifications are immediately pushed to the database.

**Note**: Before you can use the library, you need to initialize ng:
```ts
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

### Adding new objects

When adding an object to the root set, you must specify the `@graph` and `@id` (subject IRI) of the object. This will add the new object
to the database. For sub-objects, you are not forced to specify a graph IRI or subject IRI, they may be empty `""`. In that cases,
the parent graph's IRI is used and a random IRI, respectively.

### React
```tsx
import { useShape } from "@ng-org/signals/react";
import { DogShapeType } from "../shapes/orm/dogShape.shapeTypes";

// Type Set<Dog>
const dogs = useShape(DogShapeType);

// Note: Instead of calling `setState`, you just need to modify a property. That will trigger the required re-render.
```

### Vue

```ts
import { useShape } from "@ng-org/signals/vue";
import { DogShapeType } from "../shapes/orm/dogShape.shapeTypes";

// Type Set<Dog>, it's now a reactive variable.
const dogs = useShape(DogShapeType);
```

### Svelte
```ts
import { useShape } from "@ng-org/signals/svelte";
import { DogShapeType } from "../shapes/orm/dogShape.shapeTypes";

// `dogs` is a rune of type `Set<Dog>`
const dogs = useShape(DogShapeType);
```