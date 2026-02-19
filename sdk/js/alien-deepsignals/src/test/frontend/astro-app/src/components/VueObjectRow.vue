<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from "vue";
import useDeepSignal from "../../../../../hooks/vue/useDeepSignal";
import { sharedState } from "../../../utils/state";
import { recordRender, recordObjectRender } from "../../../utils/renderMetrics";
import type { TaggedObject } from "../../../utils/mockData";

let renderCount = 0;
const renderMetaRef = ref<HTMLElement | null>(null);

const props = defineProps(["entry"])

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
  <fieldset class="field" data-field="objectSet">

    <span class="object-id">{{ entry['@id'] }}</span>
    <input
      type="text"
      data-role="label"
      :value="entry.label"
      @input="(event) => entry.label = (event.target as HTMLInputElement).value"
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
  </fieldset>
</template>
