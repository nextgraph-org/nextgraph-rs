<script lang="ts">
  import { onDestroy } from "svelte";
  import useDeepSignal from "../../../../../hooks/svelte/useDeepSignal.svelte";
  import { sharedState } from "../../../utils/state";
  import {
    recordRender,
    recordObjectRender,
  } from "../../../utils/renderMetrics";
  import type { TaggedObject, TestState } from "../../../utils/mockData";

  const store = useDeepSignal(sharedState);
  let snapshot = sharedState as TestState;
  let renderCount = 0;
  let objectEntries: TaggedObject[] = Array.from(snapshot.objectSet.values());

  const rowRenderCounts = new Map<string, number>();
  const unsubscribe = store.subscribe((value) => {
    snapshot = value as TestState;
    objectEntries = Array.from(snapshot.objectSet.values());
  });

  $: renderCount += 1;
  $: recordRender("svelte", renderCount);
  $: objectEntries = Array.from(snapshot.objectSet.values()) as TaggedObject[];

  onDestroy(() => {
    unsubscribe();
    store.dispose();
  });

  const toNumber = (value: string) => Number(value || 0);
  const recordRowRender = (entryId: string) => {
    const next = (rowRenderCounts.get(entryId) ?? 0) + 1;
    rowRenderCounts.set(entryId, next);
    recordObjectRender("svelte", entryId, next);
    return next;
  };
</script>

<section>
  <h2 class="title">svelte</h2>
  <div class="render-meta" data-render-count={renderCount}>
    Render #{renderCount}
  </div>

  <div class="field-grid">
    <fieldset class="field" data-field="type">
      <legend>type</legend>
      <input
        type="text"
        data-role="editor"
        value={snapshot.type}
        on:input={(event) => (snapshot.type = event.currentTarget.value)}
      />
      <span data-role="value">{snapshot.type}</span>
    </fieldset>

    <fieldset class="field" data-field="stringValue">
      <legend>stringValue</legend>
      <input
        type="text"
        data-role="editor"
        value={snapshot.stringValue}
        on:input={(event) => (snapshot.stringValue = event.currentTarget.value)}
      />
      <span data-role="value">{snapshot.stringValue}</span>
    </fieldset>

    <fieldset class="field" data-field="numValue">
      <legend>numValue</legend>
      <input
        type="number"
        data-role="editor"
        value={snapshot.numValue}
        on:input={(event) =>
          (snapshot.numValue = toNumber(event.currentTarget.value))}
      />
      <span data-role="value">{snapshot.numValue}</span>
    </fieldset>

    <fieldset class="field" data-field="boolValue">
      <legend>boolValue</legend>
      <input
        type="checkbox"
        data-role="editor"
        checked={snapshot.boolValue}
        on:change={(event) =>
          (snapshot.boolValue = event.currentTarget.checked)}
      />
      <span data-role="value">{String(snapshot.boolValue)}</span>
    </fieldset>

    <fieldset class="field" data-field="objectValue.nestedString">
      <legend>objectValue.nestedString</legend>
      <input
        type="text"
        data-role="editor"
        value={snapshot.objectValue.nestedString}
        on:input={(event) =>
          (snapshot.objectValue.nestedString = event.currentTarget.value)}
      />
      <span data-role="value">{snapshot.objectValue.nestedString}</span>
    </fieldset>

    <fieldset class="field" data-field="objectValue.nestedNum">
      <legend>objectValue.nestedNum</legend>
      <input
        type="number"
        data-role="editor"
        value={snapshot.objectValue.nestedNum}
        on:input={(event) =>
          (snapshot.objectValue.nestedNum = toNumber(
            event.currentTarget.value
          ))}
      />
      <span data-role="value">{snapshot.objectValue.nestedNum}</span>
    </fieldset>
  </div>

  <fieldset class="field" data-field="arrayValue">
    <legend>arrayValue</legend>
    <span data-role="array-length">Length: {snapshot.arrayValue.length}</span>
    <div>
      <button
        type="button"
        data-action="push"
        on:click={() =>
          snapshot.arrayValue.push(snapshot.arrayValue.length + 1)}
      >
        Add item
      </button>
      <button
        type="button"
        data-action="pop"
        on:click={() => {
          if (snapshot.arrayValue.length) snapshot.arrayValue.pop();
        }}
      >
        Remove item
      </button>
    </div>
    <ul class="value-list">
      {#each snapshot.arrayValue as value, index (index)}
        <li>{value}</li>
      {/each}
    </ul>
  </fieldset>

  <fieldset class="field" data-field="objectValue.nestedArray">
    <legend>objectValue.nestedArray</legend>
    <span data-role="array-length"
      >Length: {snapshot.objectValue.nestedArray.length}</span
    >
    <div>
      <button
        type="button"
        data-action="push"
        on:click={() =>
          snapshot.objectValue.nestedArray.push(
            snapshot.objectValue.nestedArray.length + 10
          )}
      >
        Add nested item
      </button>
      <button
        type="button"
        data-action="pop"
        on:click={() => {
          if (snapshot.objectValue.nestedArray.length) {
            snapshot.objectValue.nestedArray.pop();
          }
        }}
      >
        Remove nested item
      </button>
    </div>
    <ul class="value-list">
      {#each snapshot.objectValue.nestedArray as value, index (index)}
        <li>{value}</li>
      {/each}
    </ul>
  </fieldset>

  <fieldset class="field" data-field="setValue">
    <legend>setValue</legend>
    <span data-role="set-size">Size: {snapshot.setValue.size}</span>
    <div>
      <button
        type="button"
        data-action="add"
        on:click={() =>
          snapshot.setValue.add(`item${snapshot.setValue.size + 1}`)}
      >
        Add entry
      </button>
      <button
        type="button"
        data-action="remove"
        on:click={() => {
          const last = Array.from(snapshot.setValue.values()).pop();
          if (last) snapshot.setValue.delete(last);
        }}
      >
        Remove entry
      </button>
    </div>
    <ul class="value-list">
      {#each Array.from(snapshot.setValue.values()) as entry (entry)}
        <li>{entry}</li>
      {/each}
    </ul>
  </fieldset>

  <fieldset class="field" data-field="objectSet">
    <legend>objectSet entries</legend>
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
            (entry.count = toNumber(event.currentTarget.value))}
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
  </fieldset>
</section>
