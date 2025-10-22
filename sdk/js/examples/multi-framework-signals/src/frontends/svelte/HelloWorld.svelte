<script lang="ts">
  import { TestObjectShapeType } from "../../shapes/orm/testShape.shapeTypes";
  import { useShape } from "@ng-org/signals/svelte";
  import flattenObject from "../utils/flattenObject";

  const shapeObject = useShape(TestObjectShapeType);

  function getNestedValue(obj: any, path: string) {
    return path
      .split(".")
      .reduce((cur, k) => (cur == null ? cur : cur[k]), obj);
  }
  function setNestedValue(obj: any, path: string, value: any) {
    const keys = path.split(".");
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      cur = cur[keys[i]];
      if (cur == null) return;
    }
    cur[keys[keys.length - 1]] = value;
  }
  const flattenedObjects = $derived(
    $shapeObject
      ? $shapeObject.values().map((o) => flattenObject(o)[0] || ({} as any))
      : []
  );
  $effect(() => {
    (window as any).svelteState = $shapeObject;
  });
</script>

{#if $shapeObject}
  <div>
    <p>Rendered in Svelte</p>

    {#each flattenedObjects as flatEntries}
      <table border="1" cellpadding="5">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {#each flatEntries as [key, value] (key)}
            <tr>
              <td style="white-space:nowrap;">{key}</td>
              <td>
                {#if value instanceof Set}
                  {Array.from(value).join(", ")}
                {:else if Array.isArray(value)}
                  [{value.join(", ")}]
                {:else}
                  {JSON.stringify(value)}
                {/if}
              </td>
              <td>
                {#if typeof value === "string"}
                  <input
                    type="text"
                    {value}
                    oninput={(e: any) =>
                      setNestedValue($shapeObject, key, e.target.value)}
                  />
                {:else if typeof value === "number"}
                  <input
                    type="number"
                    {value}
                    oninput={(e: any) =>
                      setNestedValue($shapeObject, key, Number(e.target.value))}
                  />
                {:else if typeof value === "boolean"}
                  <input
                    type="checkbox"
                    checked={value}
                    onchange={(e: any) =>
                      setNestedValue($shapeObject, key, e.target.checked)}
                  />
                {:else if Array.isArray(value)}
                  <div style="display:flex; gap:.5rem;">
                    <button
                      onclick={() => {
                        const cur = getNestedValue($shapeObject, key) || [];
                        setNestedValue($shapeObject, key, [
                          ...cur,
                          cur.length + 1,
                        ]);
                      }}>Add</button
                    >
                    <button
                      onclick={() => {
                        const cur = getNestedValue($shapeObject, key) || [];
                        if (cur.length)
                          setNestedValue($shapeObject, key, cur.slice(0, -1));
                      }}>Remove</button
                    >
                  </div>
                {:else if value instanceof Set}
                  <div style="display:flex; gap:.5rem;">
                    <button
                      onclick={() => {
                        const cur: Set<any> = getNestedValue($shapeObject, key);
                        cur.add(`item${cur.size + 1}`);
                      }}>Add</button
                    >
                    <button
                      onclick={() => {
                        const cur: Set<any> = getNestedValue($shapeObject, key);
                        const last = Array.from(cur).pop();
                        if (last !== undefined) cur.delete(last);
                      }}>Remove</button
                    >
                  </div>
                {:else}
                  N/A
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/each}
  </div>
{:else}
  <p>Loading state</p>
{/if}
