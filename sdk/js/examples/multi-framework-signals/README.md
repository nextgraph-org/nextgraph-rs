# Multi-Framework Signal Proxies

This example application demonstrates the **cross-framework reactivity** capabilities of NextGraph's ORM signals library. It showcases how the same reactive data can be seamlessly shared and synchronized across React, Vue, and Svelte components in real-time.

## Key Features

### Cross-Framework Reactivity

The application renders the same data objects in three different frameworks simultaneously:

- **React** component using `useShape` hook
- **Vue** component using `useShape` composable
- **Svelte** component using `useShape` rune

When you modify data in any framework's component (e.g., editing a text field in the React table), the changes **instantly propagate** to the Vue and Svelte components without any manual synchronization code.

### Type-Safe ORM with Generated Schemas

The application uses SHEX (Shape Expressions) to define data shapes, which are then converted to TypeScript types and schemas:

**SHEX Definition** (`src/shapes/shex/testShape.shex`):

```shex
PREFIX ex: <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

ex:TestObjectShape EXTRA a {
  a [ ex:TestObject ] ;
  ex:stringValue xsd:string ;
  ex:numValue xsd:integer ;
  ex:boolValue xsd:boolean ;
  ex:arrayValue xsd:integer* ;
  ex:objectValue { ... } ;
  ex:anotherObject { ... } * ;
  ex:numOrStr xsd:string OR xsd:integer ;
  ex:lit1Or2 ["lit1"] OR ["lit2"] ;
}
```

**Generated TypeScript types** are automatically created in `src/shapes/orm/` by running:

```bash
npm run build:orm
```

This command uses `@ng-org/shex-orm` to generate:

- `testShape.typings.ts` - TypeScript interfaces
- `testShape.schema.ts` - Runtime schema definitions
- `testShape.shapeTypes.ts` - ShapeType objects for use with `useShape`

### Automatic Database Persistence

All modifications made through the reactive proxies are **automatically persisted** to the NextGraph database. Internally, object changes trigger the creation of patches that are sent to the backend which creates SPARQL updates from them. You don't need to write any manual save logic.

### Deep Signal Proxies

The `useShape` hook returns a `DeepSignalSet<T>` which behaves like a regular JavaScript Set containing your typed objects, but with automatic reactivity at all nesting levels. You can
Directly modify nested properties: `obj.objectValue.nestedString = "new value"`,
and use standard Set operations: `objects.add(newObj)`, `objects.delete(obj)`.

All changes trigger re-renders in all frameworks and persist to the database.

## How It Works

### Initialization

In `src/app/pages/index.astro`, the NextGraph client is initialized and connected to the signals library:

```ts
import { ng, init } from "@ng-org/web";
import { initNg } from "@ng-org/signals";

await init(
    async (event) => {
        initNg(ng, event.session);
        // ...
    },
    true,
    []
);
```

### Using Shapes in CDeepSignalSetomponents

Each framework component imports the generated shape type and uses it with the framework-specific hook:

**React:**

```tsx
import { useShape } from "@ng-org/signals/react";
import { TestObjectShapeType } from "../../shapes/orm/testShape.shapeTypes";

const state = useShape(TestObjectShapeType);
```

**Vue:**

```ts
import { useShape } from "@ng-org/signals/vue";
import { TestObjectShapeType } from "../../shapes/orm/testShape.shapeTypes";

const shapeObjects = useShape(TestObjectShapeType);
```

**Svelte:**

```ts
import { useShape } from "@ng-org/signals/svelte";
import { TestObjectShapeType } from "../../shapes/orm/testShape.shapeTypes";

const shapeObjects = useShape(TestObjectShapeType);
```

For convenience, `DeepSignalSet` provides a utility function `getBy(graphIri: string, subjectIri: string)` which you can use to get objects by their graph and subject IRI instead of traversing through all items in the set..

As a second parameter to `useShape`, you can add a scope NURI to restrict the set of objects queried.

### Adding New Objects

You can simply add a new JSON object to the `DeepSignalSet`. Ensure that the object contains an `@id` and a `@graph` property. You must have write access to the `@graph`.

```ts
shapeObjects.add({
    "@id": "urn:test:obj1",
    "@graph": "did:ng:o:xypN3x...",
    "stringValue": "hello world",
    "numValue": 42,
    ...
});
```

#### Adding objects with SPARQL

When new data is added through a SPARQL update, the object will immediately appear in the set as well, too.

```ts
await ng.sparql_update(
    sessionId,
    `
  PREFIX ex: <http://example.org/>
  INSERT DATA {
    <urn:test:obj1> a ex:TestObject ;
      ex:stringValue "hello world" ;
      ex:numValue 42 ;
      ...
  }
`,
    "did:ng:o:xypN3x..."
);
```

## Running the Example

```bash
# Install dependencies
npm install

# Generate TypeScript types from SHEX shapes
npm run build:orm

# Start development server
npm run dev

# Run end-to-end tests
npm run test:e2e
```

## Learning Resources

- **Signals Library Documentation**: See `../signals/README.md` for details on using `useShape` hooks
- **SHEX-ORM Tool**: See `../shex-orm/README.md` for shape generation documentation
- **NextGraph Documentation**: Visit [https://docs.nextgraph.org](https://docs.nextgraph.org)

---

Thanks to https://github.com/aleksadencic/multi-framework-app for providing the basic multi-framework template.

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
  at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.

> > > > > > > 093d4727 (fix copyright assignment and licensing)
