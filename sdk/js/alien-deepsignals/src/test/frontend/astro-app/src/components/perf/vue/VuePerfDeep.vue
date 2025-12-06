<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
} from "vue";
import useDeepSignal from "../../../../../../../hooks/vue/useDeepSignal";
import { sharedState } from "../../../../../utils/state";
import type { TaggedObject } from "../../../../../utils/mockData";
import {
  recordObjectRender,
  recordRender,
} from "../../../../../utils/renderMetrics";
import {
  registerSharedStateAdapter,
  runScenarioImmediately,
} from "../../../../../utils/perfScenarios";

const state = useDeepSignal(sharedState);
let renderCount = 0;
const renderMetaRef = ref<HTMLElement | null>(null);
const busy = ref(false);
const rowRenderCounts = new Map<string, number>();
const objectEntries = computed<TaggedObject[]>(() =>
  Array.from(state.objectSet.values()) as TaggedObject[]
);

const updateRenderMeta = () => {
  const element = renderMetaRef.value;
  if (!element) return;
  element.dataset.renderCount = String(renderCount);
  element.textContent = `Render #${renderCount}`;
};

const noteRender = () => {
  renderCount += 1;
  updateRenderMeta();
  recordRender("vue", renderCount);
};

let disposeAdapter: (() => void) | undefined;

onMounted(() => {
  noteRender();
  disposeAdapter = registerSharedStateAdapter("vue");
});

onUpdated(() => {
  noteRender();
});

onUnmounted(() => {
  disposeAdapter?.();
});

const recordRowRender = (entryId: string) => {
  const next = (rowRenderCounts.get(entryId) ?? 0) + 1;
  rowRenderCounts.set(entryId, next);
  recordObjectRender("vue", entryId, next);
  return next;
};

const handleAddEntry = () => {
  const id = `vue-deep-${Math.random().toString(36).slice(2, 10)}`;
  state.objectSet.add({
    "@id": id,
    label: `vue ${id}`,
    count: 0,
  });
};

const handleRemoveEntry = () => {
  const last = Array.from(state.objectSet.values()).pop();
  if (!last) return;
  state.objectSet.delete(last);
};

const handleRunScenario = async () => {
  try {
    busy.value = true;
    await runScenarioImmediately("vue", "deep");
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <section class="perf-panel vue" data-field="objectSet">
    <h2 class="title">vue (deepSignal)</h2>
    <div class="render-meta" data-render-count="0" ref="renderMetaRef">
      Render #0
    </div>
    <div class="field" data-field="objectSet">
      <legend>objectSet entries</legend>
      <div class="set-controls">
        <span data-role="set-size">Size: {{ state.objectSet.size }}</span>
        <div>
          <button type="button" @click="handleAddEntry">Add entry</button>
          <button type="button" @click="handleRemoveEntry">Remove entry</button>
          <button
            type="button"
            data-action="run-scenario"
            :disabled="busy"
            @click="handleRunScenario"
          >
            {{ busy ? "Running..." : "Run perf scenario" }}
          </button>
        </div>
      </div>
      <div class="object-set">
        <div
          class="object-row"
          v-for="entry in objectEntries"
          :key="entry['@id']"
          :data-entry-id="entry['@id']"
          :data-render-count="recordRowRender(entry['@id'])"
        >
          <span class="object-id">{{ entry["@id"] }}</span>
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
            @input="(event) => (entry.count = Number((event.target as HTMLInputElement).value || 0))"
          />
          <span data-role="count">{{ entry.count }}</span>
          <button type="button" data-action="increment" @click="entry.count += 1">
            +1
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
