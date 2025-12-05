<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { TaggedObject } from "../../../../../utils/mockData";
  import { cloneDefaultObjectSet } from "../../../../../utils/mockData";
  import {
    recordObjectRender,
    recordRender,
  } from "../../../../../utils/renderMetrics";
  import {
    registerScenarioAdapter,
    runScenarioImmediately,
  } from "../../../../../utils/perfScenarios";

  const cloneInitialEntries = (): TaggedObject[] => cloneDefaultObjectSet();

  let entries: TaggedObject[] = cloneInitialEntries();
  let renderCount = 0;
  let busy = false;
  let counter = entries.length;
  const rowRenderCounts = new Map<string, number>();
  let disposeAdapter: () => void = () => undefined;

  const updateEntries = (mutate: (draft: TaggedObject[]) => void) => {
    const draft = entries.map((entry) => ({ ...entry }));
    mutate(draft);
    entries = draft;
  };

  onMount(() => {
    disposeAdapter = registerScenarioAdapter("svelte", "native", {
      reset: () => {
        entries = cloneInitialEntries();
        counter = entries.length;
      },
      mutateExisting: (iterations: number) => {
        updateEntries((draft) => {
          if (!draft.length) return;
          for (let cycle = 0; cycle < iterations; cycle += 1) {
            draft.forEach((entry, index) => {
              entry.label = `Svelte POJO ${entry["@id"]} #${cycle}-${index}`;
              entry.count += 2;
            });
          }
        });
      },
      bulkMutate: (iterations: number) => {
        updateEntries((draft) => {
          if (!draft.length) return;
          for (let i = 0; i < iterations; i += 1) {
            for (const entry of draft) {
              entry.count += 2;
            }
          }
        });
      },
      batchAddRemove: (iterations: number) => {
        const additions: TaggedObject[] = [];
        for (let i = 0; i < iterations; i += 1) {
          counter += 1;
          additions.push({
            "@id": `svelte-native-${counter}`,
            label: `Svelte Native ${counter}`,
            count: i,
          });
        }
        updateEntries((draft) => {
          draft.push(...additions);
        });
        updateEntries((draft) => {
          const removeCount = additions.length;
          draft.splice(Math.max(draft.length - removeCount, 0), removeCount);
        });
      },
    });
  });

  onDestroy(() => {
    disposeAdapter();
  });

  $: renderCount += 1;
  $: recordRender("svelte", renderCount);

  const recordRowRender = (entryId: string) => {
    const next = (rowRenderCounts.get(entryId) ?? 0) + 1;
    rowRenderCounts.set(entryId, next);
    recordObjectRender("svelte", entryId, next);
    return next;
  };

  const handleAddEntry = () => {
    counter += 1;
    updateEntries((draft) => {
      draft.push({
        "@id": `svelte-native-${counter}`,
        label: `Svelte Native ${counter}`,
        count: 0,
      });
    });
  };

  const handleRemoveEntry = () => {
    updateEntries((draft) => {
      draft.pop();
    });
  };

  const handleRunScenario = async () => {
    try {
      busy = true;
      await runScenarioImmediately("svelte", "native");
    } finally {
      busy = false;
    }
  };
</script>

<section class="perf-panel svelte" data-field="objectSet">
  <h2 class="title">svelte (native state)</h2>
  <div class="render-meta" data-render-count={renderCount}>
    Render #{renderCount}
  </div>
  <div class="field" data-field="objectSet">
    <legend>objectSet entries</legend>
    <div class="set-controls">
      <span data-role="set-size">Size: {entries.length}</span>
      <div>
        <button type="button" on:click={handleAddEntry}>Add entry</button>
        <button type="button" on:click={handleRemoveEntry}>Remove entry</button>
        <button
          type="button"
          data-action="run-scenario"
          disabled={busy}
          on:click={handleRunScenario}
        >
          {busy ? "Running..." : "Run perf scenario"}
        </button>
      </div>
    </div>
    <div class="object-set">
      {#each entries as entry (entry["@id"])}
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
            on:input={(event) =>
              updateEntries((draft) => {
                const target = draft.find(
                  (item) => item["@id"] === entry["@id"]
                );
                if (target) target.label = event.currentTarget.value;
              })}
          />
          <input
            type="number"
            data-role="count-input"
            value={entry.count}
            on:input={(event) =>
              updateEntries((draft) => {
                const target = draft.find(
                  (item) => item["@id"] === entry["@id"]
                );
                if (target)
                  target.count = Number(event.currentTarget.value || 0);
              })}
          />
          <span data-role="count">{entry.count}</span>
          <button
            type="button"
            data-action="increment"
            on:click={() =>
              updateEntries((draft) => {
                const target = draft.find(
                  (item) => item["@id"] === entry["@id"]
                );
                if (target) target.count += 1;
              })}
          >
            +1
          </button>
        </div>
      {/each}
    </div>
  </div>
</section>
