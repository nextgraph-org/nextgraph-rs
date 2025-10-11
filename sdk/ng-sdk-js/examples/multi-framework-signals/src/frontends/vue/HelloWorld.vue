<script setup lang="ts">
import { computed } from 'vue';
import { useShape } from "@nextgraph-monorepo/ng-signals/vue";
import flattenObject from '../utils/flattenObject';
import { TestObjectShapeType } from "../../shapes/orm/testShape.shapeTypes";

// Acquire deep signal object (proxy) for a shape; scope second arg left empty string for parity
const shapeObj = useShape(TestObjectShapeType);

// Expose for devtools exploration
// @ts-ignore
window.vueState = shapeObj;

const flatEntries = computed(() => flattenObject(shapeObj));

</script>


<template>
  <div class="vue">
    <p>Rendered in Vue</p>

    <template v-if="shapeObj && 'type' in shapeObj">
      <!-- Direct property access -->
      <input type="text" v-model="shapeObj.type" />
      <input type="text" v-model="shapeObj.objectValue.nestedString" />

      <!-- Property access through object recursion -->
      <table border="1" cellpadding="5" style="margin-top:1rem; max-width:100%; font-size:0.9rem;">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
            <th>Edit</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="([path, value, key, parent]) in flatEntries" :key="path">
            <!-- Key-->
            <td style="white-space:nowrap;">{{ path }}</td>

            <!-- Value -->
            <td>
              <template v-if="value instanceof Set">
                {{ Array.from(value).join(', ') }}
              </template>
              <template v-else-if="Array.isArray(value)">
                [{{ value.join(', ') }}]
              </template>
              <template v-else>
                {{ JSON.stringify(value) }}
              </template>
            </td>

            <!-- Edit -->
            <td>
              <!-- String editing -->
              <template v-if="typeof value === 'string'">
                <template v-if="path.indexOf('.') === -1">
                  <input type="text" v-model="(shapeObj)[key]" />
                </template>
                <template v-else>
                  <input type="text" v-bind:value="(parent)[key]"
                    v-on:input="(e) => { (parent)[key] = (e.target as any).value; }" />
                </template>
              </template>
              <!-- Number editing -->
              <template v-else-if="typeof value === 'number'">
                <template v-if="path.indexOf('.') === -1">
                  <input type="number" v-model="(shapeObj)[key]" />
                </template>
                <template v-else>
                  <input type="number" v-bind:value="(parent)[key]"
                    v-on:input="(e) => { (parent)[key] = +(e.target as any).value; }" />
                </template>

              </template>
              <!-- Boolean editing -->
              <template v-else-if="typeof value === 'boolean'">
                <template v-if="path.indexOf('.') === -1">
                  <input type="checkbox" v-model="(shapeObj)[key]" />
                </template>
                <template v-else>
                  <input type="checkbox" v-bind:value="value"
                    v-on:input="(e) => { (parent)[key] = (e.target as any).value; }" />
                </template>
              </template>
              <!-- Array editing -->
              <template v-else-if="Array.isArray(value)">
                <template v-if="path.indexOf('.') === -1">
                  <div style="display:flex; gap:.5rem;">
                    <button @click="() => { parent[key] = [...value, value.length + 1] }">Add</button>
                    <button @click="() => { parent[key] = value.slice(1) }">Remove</button>
                  </div>
                </template>
                <template v-else>
                  <div style="display:flex; gap:.5rem;">
                    <button @click="() => { parent[key] = [...value, value.length + 1] }">Add</button>
                    <button @click="() => { parent[key] = value.slice(1) }">Remove</button>
                  </div>
                </template>
              </template>

              <!-- Set editing -->
              <template v-else-if="value instanceof Set">
                <div style="display:flex; gap:.5rem;">
                  <button @click="() => { value.add(`item${value.size + 1}`); }">Add</button>
                  <button
                    @click="() => { const last = Array.from(value).pop(); if (last !== undefined) value.delete(last); }">Remove</button>
                </div>
              </template>
              <template v-else>
                N/A
              </template>

            </td>
          </tr>
        </tbody>
      </table>
    </template>
    <template v-else>
      <p>Loading state</p>
    </template>
  </div>
</template>