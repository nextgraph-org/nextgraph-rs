<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import useDeepSignal from "../../../../../../../hooks/svelte/useDeepSignal.svelte";
  import { sharedState } from "../../../../../utils/state";
  import type { TaggedObject, TestState } from "../../../../../utils/mockData";
  import {
    recordObjectRender,
    recordRender,
  } from "../../../../../utils/renderMetrics";
  import {
    registerSharedStateAdapter,
    runScenarioImmediately,
  } from "../../../../../utils/perfScenarios";

  const store = useDeepSignal(sharedState);
  let snapshot = sharedState as TestState;
  let objectEntries: TaggedObject[] = Array.from(snapshot.objectSet.values());
  let renderCount = 0;
  let busy = false;
  const rowRenderCounts = new Map<string, number>();
  let disposeAdapter: () => void = () => undefined;

  const unsubscribe = store.subscribe((value) => {
    snapshot = value as TestState;
    objectEntries = Array.from(snapshot.objectSet.values()) as TaggedObject[];
  });

  onMount(() => {
    disposeAdapter = registerSharedStateAdapter("svelte");
  });

  onDestroy(() => {
    unsubscribe();
    store.dispose();
    disposeAdapter();
  });

  $: objectEntries = Array.from(snapshot.objectSet.values()) as TaggedObject[];
  $: renderCount += 1;
  $: recordRender("svelte", renderCount);

  const recordRowRender = (entryId: string) => {
    const next = (rowRenderCounts.get(entryId) ?? 0) + 1;
    rowRenderCounts.set(entryId, next);
    recordObjectRender("svelte", entryId, next);
    return next;
  };

  const handleAddEntry = () => {
    const id = `svelte-deep-${Math.random().toString(36).slice(2, 10)}`;
    snapshot.objectSet.add({
      "@id": id,
      label: `svelte ${id}`,
      count: 0,
    });
  };

  const handleRemoveEntry = () => {
    const last = Array.from(snapshot.objectSet.values()).pop();
    if (!last) return;
    snapshot.objectSet.delete(last);
  };

  const handleRunScenario = async () => {
    try {
      busy = true;
      await runScenarioImmediately("svelte", "deep");
    } finally {
      busy = false;
    }
  };
</script>

<section class="perf-panel svelte" data-field="objectSet">
  <h2 class="title">svelte (deepSignal)</h2>
  <div class="render-meta" data-render-count={renderCount}>
    Render #{renderCount}
  </div>
  <div class="field" data-field="objectSet">
    <legend>objectSet entries</legend>
    <div class="set-controls">
      <span data-role="set-size">Size: {snapshot.objectSet.size}</span>
      <div>
        <button type="button" on:click={handleAddEntry}>Add entry</button>
        <button type="button" on:click={handleRemoveEntry}>Remove entry</button>
        <button
          type="button"
          data-action="run-scenario"
          class:busy
          disabled={busy}
          on:click={handleRunScenario}
        >
          {busy ? "Running..." : "Run perf scenario"}
        </button>
      </div>
    </div>
    <div class="object-set">
      {#each objectEntries as entry (entry["@id"])}
        <div
          class="object-row"
          data-entry-id={entry["@id"]}
          data-render-count={recordRowRender(entry["@id"])}
        >
          <span class="object-id">{entry["@id"]}</span>
          <input
            type="text"
            data-role="label"
            value={entry.label}
            on:input={(event) => (entry.label = event.currentTarget.value)}
          />
          <input
            type="number"
            data-role="count-input"
            value={entry.count}
            on:input={(event) =>
              (entry.count = Number(event.currentTarget.value || 0))}
          />
          <span data-role="count">{entry.count}</span>
          <button
            type="button"
            data-action="increment"
            on:click={() => (entry.count += 1)}
          >
            +1
          </button>
        </div>
      {/each}
    </div>
  </div>
</section>
