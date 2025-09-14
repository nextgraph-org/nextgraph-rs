# @ldo/svelte

## Installation

```
npm i @ldo/svelte @ldo/solid
```

## Usage

(see the "example" folder for a full example)

Initialize your LDO methods

```typescript
import { createLdoSvelteMethods } from "@ldo/svelte";
import { solidConnectedPlugin } from "@ldo/connected-solid";

export const {
  dataset,
  useLdo,
  useMatchObject,
  useMatchSubject,
  useResource,
  useSubject,
  useSubscribeToResource,
  useLinkQuery,
} = createLdoSvelteMethods([solidConnectedPlugin]);

// At some point when you log in, you'll need to set context on the dataset with
// the authentication information. For example, in Solid, you would run:
// dataset.setContext("solid", { fetch: authFetch });
```

Use them in your svelte components

```svelte
<script lang="ts">
  import { SolidProfileShapeShapeType } from "./.ldo/solidProfile.shapeTypes.js";
  // Assuming these are the Svelte-specific functions/stores from your @ldo/svelte library
  import { useResource, useSubject } from "./ldoSvelteMethods.js";
  const SAMPLE_DATA_URI =
    "http://localhost:3004/example/link-query/main-profile.ttl";
  const resource = useResource(SAMPLE_DATA_URI);

  const webId = `${SAMPLE_DATA_URI}#me`;
  const profile = useSubject(SolidProfileShapeShapeType, webId);
  $: friendArray = $profile?.knows?.toArray() || [];
  $: firstFriendId =
    friendArray.length > 0 ? friendArray[0]?.["@id"] : undefined;
</script>

<h1>LDO Svelte Support Demo</h1>
{#if $resource.isLoading() || !$profile}
  <p>loading</p>
{:else}
  <div>
    {#if firstFriendId}
      <p>{firstFriendId}</p>
    {:else}
      <p>No friend found or friend has no @id.</p>
    {/if}

    <ul>
      {#each friendArray as friend (friend["@id"])}
        <li>{friend["@id"]}</li>
      {:else}
        <li>No friends listed.</li>
      {/each}
    </ul>
  </div>
{/if}
```

