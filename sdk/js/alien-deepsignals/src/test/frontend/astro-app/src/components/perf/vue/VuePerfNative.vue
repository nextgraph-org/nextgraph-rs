<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
} from "vue";
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

const objectSet = ref<TaggedObject[]>(cloneInitialEntries());
let renderCount = 0;
const renderMetaRef = ref<HTMLElement | null>(null);
const busy = ref(false);
const rowRenderCounts = new Map<string, number>();
const counter = ref(objectSet.value.length);
const entries = computed(() => objectSet.value);

const updateEntries = (mutate: (draft: TaggedObject[]) => void) => {
  const draft = objectSet.value.map((entry) => ({ ...entry }));
  mutate(draft);
  objectSet.value = draft;
};

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

const registerAdapter = () =>
  registerScenarioAdapter("vue", "native", {
    reset: () => {
      objectSet.value = cloneInitialEntries();
      counter.value = objectSet.value.length;
    },
    mutateExisting: (iterations: number) => {
      updateEntries((draft) => {
        if (!draft.length) return;
        for (let cycle = 0; cycle < iterations; cycle += 1) {
          draft.forEach((entry, index) => {
            entry.label = `Vue POJO ${entry["@id"]} #${cycle}-${index}`;
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
        counter.value += 1;
        additions.push({
          "@id": `vue-native-${counter.value}`,
          label: `Vue Native ${counter.value}`,
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

let disposeAdapter: (() => void) | undefined;

onMounted(() => {
  noteRender();
  disposeAdapter = registerAdapter();
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

const setEntryLabel = (entryId: string, value: string) => {
  updateEntries((draft) => {
    const target = draft.find((item) => item["@id"] === entryId);
    if (target) target.label = value;
  });
};

const setEntryCount = (entryId: string, value: number) => {
  updateEntries((draft) => {
    const target = draft.find((item) => item["@id"] === entryId);
    if (target) target.count = value;
  });
};

const incrementEntryCount = (entryId: string) => {
  updateEntries((draft) => {
    const target = draft.find((item) => item["@id"] === entryId);
    if (target) target.count += 1;
  });
};

const handleAddEntry = () => {
  counter.value += 1;
  updateEntries((draft) => {
    draft.push({
      "@id": `vue-native-${counter.value}`,
      label: `Vue Native ${counter.value}`,
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
    busy.value = true;
    await runScenarioImmediately("vue", "native");
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <section class="perf-panel vue" data-field="objectSet">
    <h2 class="title">vue (native state)</h2>
    <div class="render-meta" data-render-count="0" ref="renderMetaRef">
      Render #0
    </div>
    <div class="field" data-field="objectSet">
      <legend>objectSet entries</legend>
      <div class="set-controls">
        <span data-role="set-size">Size: {{ entries.length }}</span>
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
          v-for="entry in entries"
          :key="entry['@id']"
          :data-entry-id="entry['@id']"
          :data-render-count="recordRowRender(entry['@id'])"
        >
          <span class="object-id">{{ entry["@id"] }}</span>
          <input
            type="text"
            data-role="label"
            :value="entry.label"
            @input="(event) =>
              setEntryLabel(
                entry['@id'],
                (event.target as HTMLInputElement).value
              )
            "
          />
          <input
            type="number"
            data-role="count-input"
            :value="entry.count"
            @input="(event) =>
              setEntryCount(
                entry['@id'],
                Number((event.target as HTMLInputElement).value || 0)
              )
            "
          />
          <span data-role="count">{{ entry.count }}</span>
          <button
            type="button"
            data-action="increment"
            @click="incrementEntryCount(entry['@id'])"
          >
            +1
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
