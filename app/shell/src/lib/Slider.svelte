<script lang="ts">
  import { Slider } from "@ark-ui/svelte/slider";
  let val = $state(40);
</script>

<div class="card shadow">
  <div class="card-body">
    <Slider.Root
      class=""
      value={[val]}
      onValueChange={(e) => {
        val = e.value[0];
      }}
    >
      <Slider.Label class="text-sm">Ark Slider</Slider.Label>
      <Slider.ValueText class="mt-2 text-xs opacity-60" />
      <Slider.Control class="mt-3 align-center relative">
        <Slider.Track class="h-2 rounded bg-base-300">
          <Slider.Range class="h-full rounded bg-primary" />
        </Slider.Track>
        <Slider.Thumb
          index={0}
          class="h-5 w-5 -translate-y-1/2 rounded-full bg-white ring-2 ring-primary"
        >
          <Slider.HiddenInput />
        </Slider.Thumb>
      </Slider.Control>
    </Slider.Root>
  </div>
</div>
<div class="card shadow">
  <div class="card-body">
    <p class="card-title text-sm mb-1">Card Title</p>
    <input
      type="range"
      min="0"
      max="100"
      bind:value={val}
      class="range w-full"
    />
  </div>
</div>
