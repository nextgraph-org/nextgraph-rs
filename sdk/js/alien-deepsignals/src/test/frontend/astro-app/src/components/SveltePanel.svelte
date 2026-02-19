<script lang="ts">
  import useDeepSignal from "../../../../../hooks/svelte/useDeepSignal.svelte";
  import { sharedState } from "../../../utils/state";
  import ObjectRow from "./SvelteObjectRow.svelte";

  const snapshot = useDeepSignal(sharedState);

  const rowRenderCounts = new Map<string, number>();
  
  const toNumber = (value: string) => Number(value || 0);

</script>

<section>
  <h2 class="title">Svelte 5</h2>

  <div class="field-grid">
    <fieldset class="field" data-field="type">
      <legend>type</legend>
      <input
        type="text"
        data-role="editor"
        bind:value={snapshot.type}
      />
      <span data-role="value">{snapshot.type}</span>
    </fieldset>

    <fieldset class="field" data-field="stringValue">
      <legend>stringValue</legend>
      <input
        type="text"
        data-role="editor"
        bind:value={snapshot.stringValue}
      />
      <span data-role="value">{snapshot.stringValue}</span>
    </fieldset>

    <fieldset class="field" data-field="numValue">
      <legend>numValue</legend>
      <input
        type="number"
        data-role="editor"
        value={snapshot.numValue}
        oninput={(event) =>
          (snapshot.numValue = toNumber(event.currentTarget.value))}
      />
      <span data-role="value">{snapshot.numValue}</span>
    </fieldset>

    <fieldset class="field" data-field="boolValue">
      <legend>boolValue</legend>
      <input
        type="checkbox"
        data-role="editor"
        bind:checked={snapshot.boolValue}
        />
      <span data-role="value">{String(snapshot.boolValue)}</span>
    </fieldset>

    <fieldset class="field" data-field="objectValue.nestedString">
      <legend>objectValue.nestedString</legend>
      <input
        type="text"
        data-role="editor"
        bind:value={snapshot.objectValue.nestedString}
        
      />
      <span data-role="value">{snapshot.objectValue.nestedString}</span>
    </fieldset>

    <fieldset class="field" data-field="objectValue.nestedNum">
      <legend>objectValue.nestedNum</legend>
      <input
        type="number"
        data-role="editor"
        value={snapshot.objectValue.nestedNum}
        oninput={(event) =>
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
        onclick={() =>
          snapshot.arrayValue.push(snapshot.arrayValue.length + 1)}
      >
        Add item
      </button>
      <button
        type="button"
        data-action="pop"
        onclick={() => {
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
        onclick={() =>
          snapshot.objectValue.nestedArray.push(
            snapshot.objectValue.nestedArray.length + 10
          )}
      >
        Add nested item
      </button>
      <button
        type="button"
        data-action="pop"
        onclick={() => {
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
        onclick={() =>
          snapshot.setValue.add(`item${snapshot.setValue.size + 1}`)}
      >
        Add entry
      </button>
      <button
        type="button"
        data-action="remove"
        onclick={() => {
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
    {#each snapshot.objectSet as entry (entry["@id"])}
      <ObjectRow {entry} {rowRenderCounts} />
    {/each}
  </fieldset>
</section>
