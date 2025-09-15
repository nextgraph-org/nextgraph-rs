# NextGraph alien-deepsignals

Deep structural reactivity for plain objects / arrays / Sets built on top of `alien-signals`.

Core idea: wrap a data tree in a `Proxy` that lazily creates per-property signals the first time you read them. Accessing a property returns the plain value; accessing `$prop` returns the underlying signal function. Deep mutations emit compact batched patch objects you can observe with `watch()`.

## Features

* Lazy: signals & child proxies created only when touched.
* Deep: nested objects, arrays, Sets proxied on demand.
  * [ ] TODO: Methods might not be proxied (e.g. array.push)?
* Per-property signals: fine‑grained invalidation without traversal on each change.
* Patch stream: microtask‑batched granular mutations (paths + op) for syncing external stores / framework adapters.
* Getter => computed: property getters become derived (readonly) signals automatically.
* `$` accessors: TypeScript exposes `$prop` for each non‑function key plus `$` / `$length` for arrays.
* Sets: structural `add/delete/clear` emit patches; object entries get synthetic stable ids (prefers `id` / `@id` fields or auto‑generated blank IDs).
* Shallow escape hatch: wrap sub-objects with `shallow(obj)` to track only reference replacement.

## Install

```bash
pnpm add @nextgraph-monorepo/ng-alien-deepsignals
# or
npm i @nextgraph-monorepo/ng-alien-deepsignals
```

## Quick start

```ts
import { deepSignal } from '@nextgraph-monorepo/ng-alien-deepsignals'

const state = deepSignal({
  count: 0,
  user: { name: 'Ada' },
  items: [{ id: 'i1', qty: 1 }],
  settings: new Set(['dark'])
})

state.count++                // mutate normally
state.user.name = 'Grace'    // nested write
state.items.push({ id: 'i2', qty: 2 })
state.settings.add('beta')

// Direct signal access
state.$count!.set(5)          // update via signal
console.log(state.$count!())  // read via signal function
```

## Watching patches

`watch(root, cb, options?)` observes a deepSignal root and invokes your callback with microtask‑batched mutation patches plus snapshots.

```ts
import { watch } from 'alien-deepsignals'

const stop = watch(state, ({ patches, oldValue, newValue }) => {
  for (const p of patches) {
    console.log(p.op, p.path.join('.'), 'value' in p ? p.value : p.type)
  }
})

state.user.name = 'Lin'
state.items[0].qty = 3
await Promise.resolve() // flush microtask
stop()
```

### Callback event shape

```ts
type WatchPatchEvent<T> = {
  patches: DeepPatch[]      // empty only on immediate
  oldValue: T | undefined   // deep-cloned snapshot before batch
  newValue: T               // live proxy (already mutated)
  registerCleanup(fn): void // register disposer for next batch/stop
  stopListening(): void     // unsubscribe
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `immediate` | boolean | false | Fire once right away with `patches: []`. |
| `once` | boolean | false | Auto stop after first callback (immediate counts). |

`observe()` is an alias of `watch()`.

## DeepPatch format

```ts
type DeepPatch = {
  root: symbol               // stable id per deepSignal root
  path: (string | number)[]  // root-relative segments
} & (
  | { op: 'add'; type: 'object' }                                   // assigned object/array/Set entry object
  | { op: 'add'; value: string | number | boolean }                 // primitive write
  | { op: 'remove' }                                                // deletion
  | { op: 'add'; type: 'set'; value: [] }                           // Set.clear()
  | { op: 'add'; type: 'set'; value: (string|number|boolean)[] | { [id: string]: object } } // (reserved)
)
```

Notes:
* `type:'object'` omits value to avoid deep cloning; read from `newValue` if needed.
* `Set.add(entry)` emits object vs primitive form depending on entry type; path ends with synthetic id.
* `Set.clear()` emits one structural patch and suppresses per‑entry removals in same batch.

## Sets & synthetic ids

Object entries inside Sets need a stable key. Priority:
1. `entry.id`
2. `entry['@id']`
3. Custom via `setSetEntrySyntheticId(entry, 'myId')` before `add`
4. Auto `_bN` blank id

Helpers:
```ts
import { addWithId, setSetEntrySyntheticId } from 'alien-deepsignals'

setSetEntrySyntheticId(obj, 'custom')
state.settings.add(obj)
addWithId(state.settings as any, { x:1 }, 'x1')
```

## Shallow

Skip deep proxying of a subtree (only reference replacement tracked):
```ts
import { shallow } from 'alien-deepsignals'
state.config = shallow({ huge: { blob: true } })
```

## TypeScript ergonomics

`DeepSignal<T>` exposes both plain properties and optional `$prop` signal accessors (excluded for function members). Arrays add `$` (index signal map) and `$length`.

```ts
const state = deepSignal({ count: 0, user: { name: 'A' } })
state.count++          // ok
state.$count!.set(9)    // write via signal
const n: number = state.$count!() // typed number
```

## API surface

| Function | Description |
|----------|-------------|
| `deepSignal(obj)` | Create (or reuse) reactive deep proxy. |
| `watch(root, cb, opts?)` | Observe batched deep mutations. |
| `observe(root, cb, opts?)` | Alias of `watch`. |
| `peek(obj,key)` | Untracked property read. |
| `shallow(obj)` | Mark object to skip deep proxying. |
| `isDeepSignal(val)` | Runtime predicate. |
| `isShallow(val)` | Was value marked shallow. |
| `setSetEntrySyntheticId(obj,id)` | Assign custom Set entry id. |
| `addWithId(set, entry, id)` | Insert with desired synthetic id. |
| `subscribeDeepMutations(root, cb)` | Low-level patch stream (used by watch). |

## Credits

This project is a fork of https://github.com/CCherry07/alien-deepsignals.

## License

MIT


