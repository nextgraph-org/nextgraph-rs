<!--
MIT License

Copyright (c) 2024 WJSoftware

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->
<!--
Modifications: Check if parcel is mounted before update call: `if (parcel?.getStatus() === "MOUNTED") `
-->
<script
  lang="ts"
  generics="TProps extends Record<string, any> = Record<string, any>"
>
  import {
    getSingleSpaContext,
    type SspaParcelConfig,
  } from "@wjfe/single-spa-svelte";
  import { onMount } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    sspa,
    ...restProps
  }: TProps & {
    /**
     * Required property object.  Allows the specification on the parcel to mount and the function to use to mount
     * it.
     */
    sspa: {
      /**
       * Parcel configuration object, or a function that returns a promise with the configuration object.
       */
      config: SspaParcelConfig<TProps>;
      /**
       * Optional properties to apply to the container DIV.  This is useful for adding event handlers to the
       * container, or maybe even styling it.
       */
      containerProps?: HTMLAttributes<any>;
    };
  } = $props();
  let containerProps: any = $derived({ ...(sspa.containerProps ?? {}) });

  let containerEl: any;
  let parcel: any;
  let firstRun = true;

  onMount(() => {
    // The needed mountParcel() function from context.
    const ctx = getSingleSpaContext();
    const mountParcelFn = ctx?.mountParcel ?? ctx?.library?.mountRootParcel;
    if (typeof mountParcelFn !== "function") {
      throw new Error(
        'Unexpected:  The single-spa context did not carry the "mountParcel" function.',
      );
    }
    parcel = mountParcelFn(sspa.config as SspaParcelConfig, {
      domElement: containerEl,
      ...restProps,
    });
    return async () => {
      if (parcel && parcel.getStatus() !== "MOUNTED") {
        return;
      }
      await parcel?.unmount();
      parcel = undefined;
    };
  });

  $effect(() => {
    // Must be the first line so the dependency on restProps is tracked.
    const newProps = { ...restProps };
    if (firstRun) {
      firstRun = false;
      return;
    }
    parcel?.mountPromise.then(() => {
      if (parcel?.getStatus() === "MOUNTED") parcel!.update?.(newProps);
    });
  });
</script>

<div bind:this={containerEl} {...containerProps}></div>

<style>
  div {
    display: contents;
  }
</style>
