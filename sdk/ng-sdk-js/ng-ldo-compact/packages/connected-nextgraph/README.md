# `@ldo/connected-nextgraph`

The `@ldo/connected-nextgraph` library allows you to integrate [NextGraph](https://nextgraph.org) with the [LDO](https://ldo.js.org) ecosystem. It provides a `ConnectedLdoDataset` that manages RDF data across decentralized NextGraph resources with real-time synchronization and read/write capabilities.

## Installation

First, install the required libraries:

```bash
npm install @ldo/connected-nextgraph
```

Also install a version of next-graph you wish to use

```bash
# For applications on NodeJS
npm install nextgraph
# For applications running in the web browser
npm install nextgraphweb
```

## Usage:

### 1. Setup: Create a ConnectedLdoDataset

```ts
import { createNextGraphLdoDataset } from "@ldo/connected-nextgraph";

// Create the dataset
const ldoDataset = createNextGraphLdoDataset();
```

### 2. Connect to a NextGraph Wallet Session

Before you can create or access resources, you need an active session:

```ts
import ng from "nextgraph" // or `import ng from "nextgraphweb"` for the browser

// Open your nextgraph wallet
const openedWallet = await ng.wallet_open_with_mnemonic_words(
  walletBinary,
  mnemonic,
  [1, 2, 3, 4]
);

// Start a session
const session = await ng.session_in_memory_start(
  openedWallet.V0.wallet_id,
  openedWallet.V0.personal_site
);
```

---

### 3. Link Your Dataset to the NextGraph Session
```ts
ldoDataset.setContext("nextgraph", {
  ng,
  sessionId: session.session_id
});
```

### 4. Create a Resource

To create a new resource in your store:

```ts
const resource = await ldoDataset.createResource("nextgraph");
if (!resource.isError) {
  console.log("Created resource:", resource.uri);
}
```

### 5. Read and Monitor a Resource**

#### Read Existing Resource

```ts
const resource = ldoDataset.getResource(existingUri);
const readResult = await resource.read();

if (!readResult.isError) {
  console.log("Resource loaded!", readResult.type);
}
```

#### Read Only If Unfetched

Avoid redundant fetches:

```ts
const readResult = await resource.readIfUnfetched();
```

#### Subscribe to Notifications

```ts
const unsubscribeId = await resource.subscribeToNotifications();
await resource.unsubscribeFromNotification(unsubscribeId);
await resource.unsubscribeFromAllNotifications();
```

---

### 6. Write Data to a Resource

You can write RDF data to a resource using `update()`:

```ts
import { parseRdf } from "@ldo/ldo";

const ttlData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
<#spiderman> a foaf:Person ; foaf:name "Spiderman" .
`;

const triples = await parseRdf(ttlData);

await resource.update({
  added: triples,
  removed: undefined
});
```

## Using NextGraph with React

You can also use the `@ldo/react` library with `@ldo/connected-nextgraph`.

### 1. Create the react methods

First, we initialize some methods to use with the `@ldo/connected-nextgraph` and
`@ldo/react` libraries.

```typescript
// ./reactMethods.ts
import { nextGraphConnectedPlugin } from "@ldo/connected-nextgraph";
import { createLdoReactMethods } from "@ldo/react";
import ng from "nextgraphweb";

export const {
  dataset,
  useLdo,
  useMatchObject,
  useMatchSubject,
  useResource,
  useSubject,
  useSubscribeToResource,
} = createLdoReactMethods([nextGraphConnectedPlugin]);

// Set NG on the data. When the sessionId is retrieved, `setContext` can be
// called at any time to set that as well.
dataset.setContext("nextgraph", {
  ng,
  sessionId: "SOME_ID"
});
```

### 2. Use the methods in your React components

From there, you can import these created methods in your React component and use
them as you would use any of the methods in the [@ldo/react-solid](https://ldo.js.org/latest/guides/solid_react/)
library.

```typescript
import { FunctionComponent } from "react";
import { PostShShapeType } from "./.ldo/post.shapeTypes.js";
import { useResource, useSubject } from "./reactMethods.js";

export const UseSubjectTest: FunctionComponent = () => {
  useResource("did:ng:SOME_URI");
  const post = useSubject(PostShShapeType, `SomeOtherUri`);

  return <p role="article">{post.articleBody}</p>;
};
```


## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT
