# NextGraph alien-deepsignals

Deep structural reactivity for plain objects / arrays / Sets built on top of `alien-signals`.

Hooks for Svelte, Vue, and React.

Core idea: wrap a data tree in a `Proxy` that lazily creates per-property signals the first time you read them. Deep mutations emit batched patch objects (in a JSON-patch inspired style) that you can track with `watch()`.

## Features

- Lazy: signals & child proxies created only when touched.
- Deep: nested objects, arrays, Sets proxied.
- Patch stream: microtask‑batched granular mutations (paths + op) for syncing external stores / framework adapters.
- Getter => computed: property getters become derived (readonly) signals automatically.
- Sets: `add/delete/clear/...` methods emit patches; object entries get synthetic stable ids.
- Configurable synthetic IDs: custom property generator - the synthetic ID is used in the paths of patches to identify objects in sets. By default attached as `@id` property.
- Read-only properties: protect specific properties from modification.
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
```

## Frontend Hooks

We provide hooks for Svelte 3/4, Svelte 5, Vue, and React so that you can use deepSignal objects in your frontend framework. Modifying the object within those components works as usual, just that the component will rerender automatically when the object changed (by a modification in the component or a modification from elsewhere).

Note that you can pass existing deepSignal objects to useDeepSignal (that you are using elsewhere too, for example as shared state) as well as plain JavaScript objects (which are then wrapped).

You can (and are often advised to) use deepSignals as a shared state (and sub objects thereof) across components.

### React

```tsx
import { useDeepSignal } from "@ng-org/alien-deepsignals/react";
import { DeepSignal } from "@ng-org/alien-deepsignals";
import UserComponent from "./User.tsx";
import type { User } from "./types.ts";

function UserManager() {
    const users: DeepSignal<User[]> = useDeepSignal([{ username: "Bob" }]);

    return users.map((user) => <UserComponent key={user.id} user={user} />);
}
```

In child component `User.tsx`:

```tsx
function UserComponent({ user }: { user: DeepSignal<User> }) {
    // Modifications here will trigger a re-render in the parent component
    // which updates this component.
    // For performance reasons, you are advised to call `useDeepSignal`
    // close to where its return value is used.
    return <input type="text" value={user.name} />;
}
```

### Vue

In component `UserManager.vue`

```vue
<script setup lang="ts">
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";
import { DeepSignal } from "@ng-org/alien-deepsignals";
import UserComponent from "./User.vue";
import type { User } from "./types.ts";

const users: DeepSignal<User[]> = useDeepSignal([{ username: "Bob", id: 1 }]);
</script>

<template>
    <UserComponent v-for="user in users" :key="user.id" :user="user" />
</template>
```

In a child component, `User.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
    user: DeepSignal<User>;
}>();

// The component only rerenders when user.name changes.
// It behaves the same as an object wrapped with `reactive()`
const user = props.user;
</script>
<template>
    <input type="text" v-model:value="user.name" />
</template>
```

### Svelte 3 / 4

```ts
import { useDeepSignal } from "@ng-org/alien-deepsignals/svelte4";

// `users` is a store of type `{username: string}[]`
const users = useDeepSignal([{ username: "Bob" }]);
```

### Svelte 5

```ts
import { useDeepSignal } from "@ng-org/alien-deepsignals/svelte";

// `users` is a rune of type `{username: string}[]`
const users = useDeepSignal([{ username: "Bob" }]);
```

### Other Frameworks

Integrating new frontend frameworks is fairly easy. Get in touch if you are interested.

## License

This project is a fork of https://github.com/CCherry07/alien-deepsignals, forked at commit `b691dc9202c58f63c1bf78675577c811316396db`. All code previous to this commit is licensed under MIT, and author is CCherry. No copyright attribution is present. This codebase is therefor relicensed under dual MIT and Apache 2.0 licensing.

All subsequent commits are from Laurin Weger and are licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
  at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.
