<script lang="ts">
  import useDeepSignal from "../../../../../hooks/svelte/useDeepSignal.svelte";
  import { sharedState } from "../../../utils/state";
  import ObjectRow from "./SvelteObjectRow.svelte";

  const state = useDeepSignal(sharedState);

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
        bind:value={state.type}
      />
      <span data-role="value">{state.type}</span>
    </fieldset>

    <fieldset class="field" data-field="stringValue">
      <legend>stringValue</legend>
      <input
        type="text"
        data-role="editor"
        bind:value={state.stringValue}
      />
      <span data-role="value">{state.stringValue}</span>
    </fieldset>

    <fieldset class="field" data-field="numValue">
      <legend>numValue</legend>
      <input
        type="number"
        data-role="editor"
        value={state.numValue}
        oninput={(event) =>
          (state.numValue = toNumber(event.currentTarget.value))}
      />
      <span data-role="value">{state.numValue}</span>
    </fieldset>

    <fieldset class="field" data-field="boolValue">
      <legend>boolValue</legend>
      <input
        type="checkbox"
        data-role="editor"
        bind:checked={state.boolValue}
        />
      <span data-role="value">{String(state.boolValue)}</span>
    </fieldset>

    <fieldset class="field" data-field="objectValue.nestedString">
      <legend>objectValue.nestedString</legend>
      <input
        type="text"
        data-role="editor"
        bind:value={state.objectValue.nestedString}
        
      />
      <span data-role="value">{state.objectValue.nestedString}</span>
    </fieldset>

    <fieldset class="field" data-field="objectValue.nestedNum">
      <legend>objectValue.nestedNum</legend>
      <input
        type="number"
        data-role="editor"
        value={state.objectValue.nestedNum}
        oninput={(event) =>
          (state.objectValue.nestedNum = toNumber(
            event.currentTarget.value
          ))}
      />
      <span data-role="value">{state.objectValue.nestedNum}</span>
    </fieldset>
  </div>

  <fieldset class="field" data-field="arrayValue">
    <legend>arrayValue</legend>
    <span data-role="array-length">Length: {state.arrayValue.length}</span>
    <div>
      <button
        type="button"
        data-action="push"
        onclick={() =>
          state.arrayValue.push(state.arrayValue.length + 1)}
      >
        Add item
      </button>
      <button
        type="button"
        data-action="pop"
        onclick={() => {
          if (state.arrayValue.length) state.arrayValue.pop();
        }}
      >
        Remove item
      </button>
    </div>
    <ul class="value-list">
      {#each state.arrayValue as value, index (index)}
        <li>{value}</li>
      {/each}
    </ul>
  </fieldset>

  <fieldset class="field" data-field="objectValue.nestedArray">
    <legend>objectValue.nestedArray</legend>
    <span data-role="array-length"
      >Length: {state.objectValue.nestedArray.length}</span
    >
    <div>
      <button
        type="button"
        data-action="push"
        onclick={() =>
          state.objectValue.nestedArray.push(
            state.objectValue.nestedArray.length + 10
          )}
      >
        Add nested item
      </button>
      <button
        type="button"
        data-action="pop"
        onclick={() => {
          if (state.objectValue.nestedArray.length) {
            state.objectValue.nestedArray.pop();
          }
        }}
      >
        Remove nested item
      </button>
    </div>
    <ul class="value-list">
      {#each state.objectValue.nestedArray as value, index (index)}
        <li>{value}</li>
      {/each}
    </ul>
  </fieldset>

  <fieldset class="field" data-field="setValue">
    <legend>setValue</legend>
    <span data-role="set-size">Size: {state.setValue.size}</span>
    <div>
      <button
        type="button"
        data-action="add"
        onclick={() =>
          state.setValue.add(`item${state.setValue.size + 1}`)}
      >
        Add entry
      </button>
      <button
        type="button"
        data-action="remove"
        onclick={() => {
          const last = Array.from(state.setValue.values()).pop();
          if (last) state.setValue.delete(last);
        }}
      >
        Remove entry
      </button>
    </div>
    <ul class="value-list">
      {#each Array.from(state.setValue.values()) as entry (entry)}
        <li>{entry}</li>
      {/each}
    </ul>
  </fieldset>

  <fieldset class="field" data-field="objectSet">
    <legend>objectSet entries</legend>
    {#each state.objectSet as entry (entry["@id"])}
      <ObjectRow {entry} {rowRenderCounts} />
    {/each}
  </fieldset>
</section>
