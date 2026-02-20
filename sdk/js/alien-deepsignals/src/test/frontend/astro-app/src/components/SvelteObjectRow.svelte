<!--
// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT
-->

<script lang="ts">
  import { recordObjectRender } from "../../../utils/renderMetrics";
  import type { TaggedObject } from "../../../utils/mockData";
    import type { DeepSignal } from "../../../../../types";

  interface Props {
    entry: DeepSignal<TaggedObject>;
    rowRenderCounts: Map<string, number>;
  }

  let { entry, rowRenderCounts }: Props = $props();
    
  const toNumber = (value: string) => Number(value || 0);
  
  const recordRowRender = (entryId: string) => {
    const next = (rowRenderCounts.get(entryId) ?? 0) + 1;
    rowRenderCounts.set(entryId, next);
    recordObjectRender("svelte", entryId, next);
    return next;
  };

</script>

<div
  class="object-row"
  data-entry-id={entry["@id"]}
  data-render-count={recordRowRender(entry["@id"])}
>

  <span class="object-id">{entry["@id"]}</span>
  <input
    type="text"
    data-role="label"
    bind:value={entry.label}
  />
  <input
    type="number"
    data-role="count-input"
    value={entry.count}
    oninput={(event) => (entry.count = toNumber(event.currentTarget.value))}
  />
  <span data-role="count">{entry.count}</span>
  <button
    type="button"
    data-action="increment"
    onclick={() => (entry.count += 1)}
  >
    +1
  </button>
</div>