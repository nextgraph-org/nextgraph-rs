<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from "vue";
import useDeepSignal from "../../../../../hooks/vue/useDeepSignal";
import { sharedState } from "../../../utils/state";
import { recordRender, recordObjectRender } from "../../../utils/renderMetrics";
import type { TaggedObject } from "../../../utils/mockData";

const state = useDeepSignal(sharedState);
let renderCount = 0;
const renderMetaRef = ref<HTMLElement | null>(null);

const objectEntries = computed<TaggedObject[]>(() =>
  Array.from(state.objectSet.values()) as TaggedObject[]
);

const updateRenderMeta = () => {
  const element = renderMetaRef.value;
  if (!element) return;
  element.dataset.renderCount = String(renderCount);
  element.textContent = `Render #${renderCount}`;
};

const recordVueRender = () => {
  renderCount += 1;
  updateRenderMeta();
  recordRender("vue", renderCount);
};

onMounted(() => {
  recordVueRender();
});

onUpdated(() => {
  recordVueRender();
});


const toNumber = (value: string) => Number(value || 0);

const addArrayItem = () => {
  state.arrayValue.push(state.arrayValue.length + 1);
};
const removeArrayItem = () => {
  if (state.arrayValue.length) state.arrayValue.pop();
};
const addNestedArrayItem = () => {
  state.objectValue.nestedArray.push(state.objectValue.nestedArray.length + 10);
};
const removeNestedArrayItem = () => {
  if (state.objectValue.nestedArray.length) state.objectValue.nestedArray.pop();
};
const addSetEntry = () => {
  state.setValue.add(`item${state.setValue.size + 1}`);
};
const removeSetEntry = () => {
  const last = Array.from(state.setValue.values()).pop();
  if (last) state.setValue.delete(last);
};
const rowRenderCounts = new Map<string, number>();
const incrementObjectCount = (entry: TaggedObject) => {
  entry.count += 1;
};

const recordRowRender = (entryId: string) => {
  const current = (rowRenderCounts.get(entryId) ?? 0) + 1;
  rowRenderCounts.set(entryId, current);
  recordObjectRender("vue", entryId, current);
  return current;
};
</script>

<template>
  <section>
    <h2 class="title">vue</h2>
    <div class="render-meta" data-render-count="0" ref="renderMetaRef">Render #0</div>

    <div class="field-grid">
      <fieldset class="field" data-field="type">
        <legend>type</legend>
        <input
          type="text"
          data-role="editor"
          :value="state.type"
          @input="(event) => (state.type = (event.target as HTMLInputElement).value)"
        />
        <span data-role="value">{{ state.type }}</span>
      </fieldset>

      <fieldset class="field" data-field="stringValue">
        <legend>stringValue</legend>
        <input
          type="text"
          data-role="editor"
          :value="state.stringValue"
          @input="(event) => (state.stringValue = (event.target as HTMLInputElement).value)"
        />
        <span data-role="value">{{ state.stringValue }}</span>
      </fieldset>

      <fieldset class="field" data-field="numValue">
        <legend>numValue</legend>
        <input
          type="number"
          data-role="editor"
          :value="state.numValue"
          @input="(event) => (state.numValue = toNumber((event.target as HTMLInputElement).value))"
        />
        <span data-role="value">{{ state.numValue }}</span>
      </fieldset>

      <fieldset class="field" data-field="boolValue">
        <legend>boolValue</legend>
        <input
          type="checkbox"
          data-role="editor"
          :checked="state.boolValue"
          @change="(event) => (state.boolValue = (event.target as HTMLInputElement).checked)"
        />
        <span data-role="value">{{ String(state.boolValue) }}</span>
      </fieldset>

      <fieldset class="field" data-field="objectValue.nestedString">
        <legend>objectValue.nestedString</legend>
        <input
          type="text"
          data-role="editor"
          :value="state.objectValue.nestedString"
          @input="(event) => (state.objectValue.nestedString = (event.target as HTMLInputElement).value)"
        />
        <span data-role="value">{{ state.objectValue.nestedString }}</span>
      </fieldset>

      <fieldset class="field" data-field="objectValue.nestedNum">
        <legend>objectValue.nestedNum</legend>
        <input
          type="number"
          data-role="editor"
          :value="state.objectValue.nestedNum"
          @input="(event) => (state.objectValue.nestedNum = toNumber((event.target as HTMLInputElement).value))"
        />
        <span data-role="value">{{ state.objectValue.nestedNum }}</span>
      </fieldset>
    </div>

    <fieldset class="field" data-field="arrayValue">
      <legend>arrayValue</legend>
      <span data-role="array-length">Length: {{ state.arrayValue.length }}</span>
      <div>
        <button type="button" data-action="push" @click="addArrayItem">Add item</button>
        <button type="button" data-action="pop" @click="removeArrayItem">Remove item</button>
      </div>
      <ul class="value-list">
        <li v-for="(value, index) in state.arrayValue" :key="`array-${index}`">
          {{ value }}
        </li>
      </ul>
    </fieldset>

    <fieldset class="field" data-field="objectValue.nestedArray">
      <legend>objectValue.nestedArray</legend>
      <span data-role="array-length">Length: {{ state.objectValue.nestedArray.length }}</span>
      <div>
        <button type="button" data-action="push" @click="addNestedArrayItem">Add nested item</button>
        <button type="button" data-action="pop" @click="removeNestedArrayItem">Remove nested item</button>
      </div>
      <ul class="value-list">
        <li v-for="(value, index) in state.objectValue.nestedArray" :key="`nested-${index}`">
          {{ value }}
        </li>
      </ul>
    </fieldset>

    <fieldset class="field" data-field="setValue">
      <legend>setValue</legend>
      <span data-role="set-size">Size: {{ state.setValue.size }}</span>
      <div>
        <button type="button" data-action="add" @click="addSetEntry">Add entry</button>
        <button type="button" data-action="remove" @click="removeSetEntry">Remove entry</button>
      </div>
      <ul class="value-list">
        <li v-for="entry in Array.from(state.setValue.values())" :key="`set-${entry}`">
          {{ entry }}
        </li>
      </ul>
    </fieldset>

    <fieldset class="field" data-field="objectSet">
      <legend>objectSet entries</legend>
      <div
        class="object-row"
        v-for="entry in objectEntries"
        :key="entry['@id']"
        :data-entry-id="entry['@id']"
        :data-render-count="recordRowRender(entry['@id'])"
      >
        <span class="object-id">{{ entry['@id'] }}</span>
        <input
          type="text"
          data-role="label"
          :value="entry.label"
          @input="(event) => (entry.label = (event.target as HTMLInputElement).value)"
        />
        <input
          type="number"
          data-role="count-input"
          :value="entry.count"
          @input="(event) => (entry.count = toNumber((event.target as HTMLInputElement).value))"
        />
        <span data-role="count">{{ entry.count }}</span>
        <button type="button" data-action="increment" @click="incrementObjectCount(entry)">
          +1
        </button>
      </div>
    </fieldset>
  </section>
</template>
