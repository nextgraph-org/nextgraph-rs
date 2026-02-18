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
  
  const snapshot = useDeepSignal(entry);
  
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
  data-entry-id={snapshot["@id"]}
  data-render-count={recordRowRender(snapshot["@id"])}
>

  <span class="object-id">{snapshot["@id"]}</span>
  <input
    type="text"
    data-role="label"
    value={snapshot.label}
    oninput={(event) => (snapshot.label = event.currentTarget.value)}
  />
  <input
    type="number"
    data-role="count-input"
    value={snapshot.count}
    oninput={(event) =>
      (snapshot.count = toNumber(event.currentTarget.value))}
  />
  <span data-role="count">{snapshot.count}</span>
  <button
    type="button"
    data-action="increment"
    onclick={() => (snapshot.count += 1)}
  >
    +1
  </button>
</div>