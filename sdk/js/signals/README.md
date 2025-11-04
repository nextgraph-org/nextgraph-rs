# Reactive ORM Library for NextGraph


## How to Define Object Schemas (Shapes)

## How to use
Once you have a shape type, you can use it to create ORM objects. We provide hooks for react, vue, and svelte.

Just pass a shape type object to the hook and it will return proxied signal-object. They behave like regular objects
but as you make changes to the objects at any place in your code, the components will re-render accordingly.

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
### React
```tsx
import { useShape } from "@ng-org/signals/react";
import { DogShapeType } from "../shapes/orm/dogShape.shapeTypes";

// Type Set<Dog>
const dogs = useShape(DogShapeType);

// Note: Instead of calling `setState`, you just need to modify a property. That will trigger the required re-render.
```

### Vue

### Svelte
