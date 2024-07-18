<!--
// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<!--
    @component DeviceIcon
    Display an icon for a device class provided by the `device` attribute.
    Pass `config` for custom attributes.
-->

<script lang="ts">
    import {
      Icon,
      Bolt,
      Megaphone,
      QuestionMarkCircle,
      Key,
    } from "svelte-heros-v2";
  
    import DataClassIcon from "../DataClassIcon.svelte";

    export let config = {};
    export let img: string;
  
    const mapping = {
      stream: Bolt,
      channel: Megaphone,
      private: Key,
    };
  
    const find = (dataClass: string) => {
      return mapping[dataClass] || QuestionMarkCircle;
    };
</script>
  
{#if img.startsWith("blob:")}
    <img style="aspect-ratio:1;" class="rounded-full" src={img} alt="profile"/>
{:else if img.startsWith("class:")}
    <DataClassIcon {config} dataClass={img.slice(6)} />
{:else if img.startsWith("nav:")}
    <Icon {...config} variation="outline" color="currentColor" icon={find(img.slice(4))} />
{:else}
    <QuestionMarkCircle {...config}/>
{/if}

  
  