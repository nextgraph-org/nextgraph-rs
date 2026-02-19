<script lang="ts">
  import useDeepSignal from "../../../../../hooks/svelte/useDeepSignal.svelte";
  import { recordObjectRender } from "../../../utils/renderMetrics";
  import type { TaggedObject } from "../../../utils/mockData";
  import type { DeepSignal } from "../../../../../types";

  interface Props {
    entry: DeepSignal<TaggedObject>;
    rowRenderCounts: Map<string, number>;
  }

  let { entry, rowRenderCounts }: Props = $props();
    
  const toNumber = (value: string) => Number(value || 0);
  
  const recordRowRender = (entryId: string) => {
    const next = (rowRenderCounts.get(entryId) ?? 0) + 1;
    rowRenderCounts.set(entryId, next);
    recordObjectRender("svelte", entryId, next);
    return next;
  };

</script>

<div
  class="object-row"
  data-entry-id={entry["@id"]}
  data-render-count={recordRowRender(entry["@id"])}
>

  <span class="object-id">{entry["@id"]}</span>
  <input
    type="text"
    data-role="label"
    bind:value={entry.label}
  />
  <input
    type="number"
    data-role="count-input"
    value={entry.count}
    oninput={(event) =>
      (entry.count = toNumber(event.currentTarget.value))}
  />
  <span data-role="count">{entry.count}</span>
  <button
    type="button"
    data-action="increment"
    onclick={() => (entry.count += 1)}
  >
    +1
  </button>
</div>