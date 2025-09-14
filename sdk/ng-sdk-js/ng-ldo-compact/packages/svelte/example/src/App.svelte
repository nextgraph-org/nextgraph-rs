<script lang="ts">
  import { SolidProfileShapeShapeType } from "./.ldo/solidProfile.shapeTypes";
  // Assuming these are the Svelte-specific functions/stores from your @ldo/svelte library
  import { useResource, useSubject } from "./ldoSvelteMethods";
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
