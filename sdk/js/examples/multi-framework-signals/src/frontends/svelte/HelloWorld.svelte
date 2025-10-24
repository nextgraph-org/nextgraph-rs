<script lang="ts">
  import { useShape } from "@ng-org/signals/svelte";
  import flattenObject from "../utils/flattenObject";
  import { BasicShapeType } from "../../shapes/orm/basic.shapeTypes";

  const shapeObjects = useShape(BasicShapeType);

  function getNestedValue(obj: any, path: string) {
    return path
      .split(".")
      .reduce((cur, k) => (cur == null ? cur : cur[k]), obj);
  }
  function setNestedValue(targetObj: any, lastKey: string, value: any) {
    // targetObj is the direct parent object containing the property
    // lastKey is the property name to set
    targetObj[lastKey] = value;
  }
  const flattenedObjects = $derived(
    $shapeObjects
      ? Array.from($shapeObjects.values()).map((o) => {
          const flattened = flattenObject(o);
          (window as any).svelteFlattened = flattened;
          return { entries: flattened, rootObj: o };
        })
      : []
  );
  (window as any).svelteState = $shapeObjects;
</script>

{#if $shapeObjects}
  <div>
    <p>Rendered in Svelte</p>

    {#each flattenedObjects as { entries: flatEntries, rootObj }}
      <table border="1" cellpadding="5">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {#each flatEntries as [key, value, lastKey, parentObj]}
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
                      setNestedValue(parentObj, lastKey, e.target.value)}
                  />
                {:else if typeof value === "number"}
                  <input
                    type="number"
                    {value}
                    oninput={(e: any) =>
                      setNestedValue(
                        parentObj,
                        lastKey,
                        Number(e.target.value)
                      )}
                  />
                {:else if typeof value === "boolean"}
                  <input
                    type="checkbox"
                    checked={value}
                    onchange={(e: any) =>
                      setNestedValue(parentObj, lastKey, e.target.checked)}
                  />
                {:else if Array.isArray(value)}
                  <div style="display:flex; gap:.5rem;">
                    <button
                      onclick={() => {
                        setNestedValue(parentObj, lastKey, [
                          ...value,
                          value.length + 1,
                        ]);
                      }}>Add</button
                    >
                    <button
                      onclick={() => {
                        if (value.length)
                          setNestedValue(
                            parentObj,
                            lastKey,
                            value.slice(0, -1)
                          );
                      }}>Remove</button
                    >
                  </div>
                {:else if value instanceof Set}
                  <div style="display:flex; gap:.5rem;">
                    <button
                      onclick={() => {
                        const newSet = new Set(value);
                        newSet.add(`item${newSet.size + 1}`);
                        setNestedValue(parentObj, lastKey, newSet);
                      }}>Add</button
                    >
                    <button
                      onclick={() => {
                        const arr = Array.from(value);
                        const last = arr.pop();
                        if (last !== undefined) {
                          const newSet = new Set(arr);
                          setNestedValue(parentObj, lastKey, newSet);
                        }
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
