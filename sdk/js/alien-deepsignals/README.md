# NextGraph alien-deepsignals

Deep structural reactivity for plain objects / arrays / Sets built on top of `alien-signals`.

Core idea: wrap a data tree in a `Proxy` that lazily creates per-property signals the first time you read them. Accessing a property returns the plain value; accessing `$prop` returns the underlying signal function. Deep mutations emit compact batched patch objects you can observe with `watch()`.

## Features

- Lazy: signals & child proxies created only when touched.
- Deep: nested objects, arrays, Sets proxied on demand.
    - [ ] TODO: Methods might not be proxied (e.g. array.push)?
- Per-property signals: fine‑grained invalidation without traversal on each change.
- Patch stream: microtask‑batched granular mutations (paths + op) for syncing external stores / framework adapters.
- Getter => computed: property getters become derived (readonly) signals automatically.
- `$` accessors: TypeScript exposes `$prop` for each non‑function key plus `$` / `$length` for arrays.
- Sets: structural `add/delete/clear` emit patches; object entries get synthetic stable ids via `@id` property.
- `@id` property system: configurable automatic ID assignment to objects with custom generators.
- Shallow escape hatch: wrap sub-objects with `shallow(obj)` to track only reference replacement.

## Install

```bash
pnpm add @ng-org/alien-deepsignals
# or
npm i @ng-org/alien-deepsignals
```

## Quick start

```ts
import { deepSignal } from "@ng-org/alien-deepsignals";

const state = deepSignal({
    count: 0,
    user: { name: "Ada" },
    items: [{ id: "i1", qty: 1 }],
    settings: new Set(["dark"]),
});

state.count++; // mutate normally
state.user.name = "Grace"; // nested write
state.items.push({ id: "i2", qty: 2 });
state.settings.add("beta");

// Direct signal access
state.$count!.set(5); // update via signal
console.log(state.$count!()); // read via signal function
```

## Configuration options

`deepSignal(obj, options?)` accepts an optional configuration object:

```ts
type DeepSignalOptions = {
    idGenerator?: (pathToObject: (string | number)[]) => string | number; // Custom ID generator function
    addIdToObjects?: boolean; // Automatically add @id to plain objects
};
```

### Custom ID generation

Provide a custom function to generate synthetic IDs instead of auto-generated blank node IDs:

```ts
let counter = 0;
const state = deepSignal(
    { items: new Set() },
    { 
        idGenerator: () => `urn:item:${++counter}`,
        addIdToObjects: true 
    }
);

state.items.add({ name: "Item 1" }); // Gets @id: "urn:item:1"
state.items.add({ name: "Item 2" }); // Gets @id: "urn:item:2"
```

### The `@id` property

When `addIdToObjects: true`, plain objects automatically receive a readonly, enumerable `@id` property:

```ts
const state = deepSignal(
    { data: {} },
    { 
        idGenerator: (_path) => `urn:uuid:${crypto.randomUUID()}`,
        addIdToObjects: true 
    }
);

state.data.user = { name: "Ada" };
console.log(state.data.user["@id"]); // e.g., "urn:uuid:550e8400-e29b-41d4-a716-446655440000"

// @id is readonly
state.data.user["@id"] = "new-id"; // TypeError in strict mode

// @id assignment emits a patch
watch(state, ({ patches }) => {
    // patches includes: { op: "add", path: ["data", "user", "@id"], value: "..." }
});
```

**Key behaviors:**

- `@id` is assigned **before** the object is proxied, ensuring it's available immediately
- `@id` properties are **readonly** and **enumerable**
- Assigning `@id` emits a patch just like any other property
- Objects with existing `@id` properties keep their values (not overwritten)
- Options propagate to nested objects created after initialization

## Watching patches

`watch(root, cb, options?)` observes a deepSignal root and invokes your callback with microtask‑batched mutation patches plus snapshots.

```ts
import { watch } from "alien-deepsignals";

const stop = watch(state, ({ patches, oldValue, newValue }) => {
    for (const p of patches) {
        console.log(p.op, p.path.join("."), "value" in p ? p.value : p.type);
    }
});

state.user.name = "Lin";
state.items[0].qty = 3;
await Promise.resolve(); // flush microtask
stop();
```

### Callback event shape

```ts
type WatchPatchEvent<T> = {
    patches: DeepPatch[]; // empty only on immediate
    oldValue: T | undefined; // deep-cloned snapshot before batch
    newValue: T; // live proxy (already mutated)
    registerCleanup(fn): void; // register disposer for next batch/stop
    stopListening(): void; // unsubscribe
};
```

### Options

| Option      | Type    | Default | Description                                        |
| ----------- | ------- | ------- | -------------------------------------------------- |
| `immediate` | boolean | false   | Fire once right away with `patches: []`.           |
| `once`      | boolean | false   | Auto stop after first callback (immediate counts). |

`observe()` is an alias of `watch()`.

## DeepPatch format

```ts
type DeepPatch = {
    root: symbol; // stable id per deepSignal root
    path: (string | number)[]; // root-relative segments
} & (
    | { op: "add"; type: "object" } // assigned object/array/Set entry object
    | { op: "add"; value: string | number | boolean } // primitive write
    | { op: "remove" } // deletion
    | { op: "add"; type: "set"; value: [] } // Set.clear()
    | {
          op: "add";
          type: "set";
          value: (string | number | boolean)[] | { [id: string]: object };
      } // (reserved)
);
```

Notes:

- `type:'object'` omits value to avoid deep cloning; read from `newValue` if needed.
- `Set.add(entry)` emits object vs primitive form depending on entry type; path ends with synthetic id.
- `Set.clear()` emits one structural patch and suppresses per‑entry removals in same batch.

## Sets & synthetic ids

Object entries inside Sets need a stable key for patch paths. The synthetic ID resolution follows this priority:

1. Explicit custom ID via `setSetEntrySyntheticId(entry, 'myId')` (before `add`)
2. Existing `entry['@id']` property
3. Auto-generated blank node ID (`_bN` format)

### Working with Sets

```ts
import { addWithId, setSetEntrySyntheticId } from "@ng-org/alien-deepsignals";

// Option 1: Use @id from configuration
const state = deepSignal(
    { items: new Set() },
    { 
        idGenerator: (_path) => `urn:uuid:${crypto.randomUUID()}`,
        addIdToObjects: true 
    }
);
const item = { name: "Item 1" };
state.items.add(item); // Automatically gets @id before being added
console.log(item["@id"]); // e.g., "urn:uuid:550e8400-..."

// Option 2: Manually set synthetic ID
const obj = { value: 42 };
setSetEntrySyntheticId(obj, "urn:custom:my-id");
state.items.add(obj);

// Option 3: Use convenience helper
addWithId(state.items as any, { value: 99 }, "urn:item:special");

// Option 4: Pre-assign @id property
const preTagged = { "@id": "urn:explicit:123", data: "..." };
state.items.add(preTagged); // Uses "urn:explicit:123" as synthetic ID
```

### Set entry patches and paths

When objects are added to Sets, their **synthetic ID becomes part of the patch path**. This allows patches to uniquely identify which Set entry is being mutated.

```ts
const state = deepSignal(
    { s: new Set() }, 
    { 
        idGenerator: () => "urn:entry:set-entry-1",
        addIdToObjects: true 
    }
);

watch(state, ({ patches }) => {
    console.log(JSON.stringify(patches));
    // [
    //   {"path":["s","urn:entry:set-entry-1"],"op":"add","type":"object"},
    //   {"path":["s","urn:entry:set-entry-1","@id"],"op":"add","value":"urn:entry:set-entry-1"},
    //   {"path":["s","urn:entry:set-entry-1","data"],"op":"add","value":"test"}
    // ]
});

state.s.add({ data: "test" });
```

**Path structure explained:**

- `["s", "urn:entry:set-entry-1"]` - The structural Set patch; the IRI identifies the entry
- `["s", "urn:entry:set-entry-1", "@id"]` - Patch for the @id property assignment
- `["s", "urn:entry:set-entry-1", "data"]` - Nested property patch; the IRI identifies which Set entry
- The synthetic ID (the IRI) is stable across mutations, allowing tracking of the same object

**Mutating nested properties:**

```ts
const state = deepSignal(
    { users: new Set() }, 
    { 
        idGenerator: (path) => `urn:user:${path.join("-")}:${crypto.randomUUID()}`,
        addIdToObjects: true 
    }
);
const user = { name: "Ada", age: 30 };
state.users.add(user); // Gets @id, e.g., "urn:user:550e8400-..."

watch(state, ({ patches }) => {
    console.log(JSON.stringify(patches));
    // [{"path":["users","urn:user:550e8400-...","age"],"op":"add","value":31}]
});

// Later mutation: synthetic ID identifies which Set entry changed
user.age = 31;
```

The path `["users", "urn:user:550e8400-...", "age"]` shows:
1. `users` - the Set container
2. `urn:user:550e8400-...` - the IRI identifying which object in the Set
3. `age` - the property being mutated

This structure enables precise tracking of nested changes within Set entries, critical for syncing state changes or implementing undo/redo.

## Shallow

Skip deep proxying of a subtree (only reference replacement tracked):

```ts
import { shallow } from "alien-deepsignals";
state.config = shallow({ huge: { blob: true } });
```

## TypeScript ergonomics

`DeepSignal<T>` exposes both plain properties and optional `$prop` signal accessors (excluded for function members). Arrays add `$` (index signal map) and `$length`.

```ts
const state = deepSignal({ count: 0, user: { name: "A" } });
state.count++; // ok
state.$count!.set(9); // write via signal
const n: number = state.$count!(); // typed number
```

## API surface

| Function                           | Description                                       |
| ---------------------------------- | ------------------------------------------------- |
| `deepSignal(obj, options?)`        | Create (or reuse) reactive deep proxy with optional configuration. |
| `watch(root, cb, opts?)`           | Observe batched deep mutations.                   |
| `observe(root, cb, opts?)`         | Alias of `watch`.                                 |
| `peek(obj,key)`                    | Untracked property read.                          |
| `shallow(obj)`                     | Mark object to skip deep proxying.                |
| `isDeepSignal(val)`                | Runtime predicate.                                |
| `isShallow(val)`                   | Was value marked shallow.                         |
| `setSetEntrySyntheticId(obj,id)`   | Assign custom Set entry id (highest priority).    |
| `addWithId(set, entry, id)`        | Insert with desired synthetic id (convenience).   |
| `subscribeDeepMutations(root, cb)` | Low-level patch stream (used by watch).           |

## Credits

This project is a fork of https://github.com/CCherry07/alien-deepsignals.

## License

MIT
