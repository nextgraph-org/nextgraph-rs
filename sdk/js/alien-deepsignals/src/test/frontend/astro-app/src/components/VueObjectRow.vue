<script setup lang="ts">
import {  onMounted, onUpdated, ref } from "vue";
import { recordRender } from "../../../utils/renderMetrics";
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

const incrementObjectCount = (entry: TaggedObject) => {
  entry.count += 1;
};

</script>

<template>
  <fieldset class="field" data-field="objectSet">

    <span class="object-id">{{ entry['@id'] }}</span>
    <input
      type="text"
      data-role="label"
      v-model="props.entry.label"
    />
    <input
      type="number"
      data-role="count-input"
      :value="props.entry.count"
      @input="(event) => (props.entry.count = toNumber((event.target as HTMLInputElement).value))"
    />
    <span data-role="count">{{ props.entry.count }}</span>
    <button type="button" data-action="increment" @click="incrementObjectCount(props.entry)">
      +1
    </button>
  </fieldset>
</template>
