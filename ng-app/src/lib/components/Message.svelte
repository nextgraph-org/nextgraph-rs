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

<script lang="ts">
  import {
    Toast,
  } from "flowbite-svelte";
 
  import {
    remove_toast
  } from "../../store";
  import { onMount, onDestroy, tick } from "svelte";

  const toast_color = {
    "error":"red",
    "warning":"orange",
    "success":"green",
    "info":"blue"
  };

  const toast_icon = {
    "error": XCircle,
    "warning": ExclamationCircle,
    "success": CheckCircle,
    "info": InformationCircle,
  }
  import {
    CheckCircle,
    XCircle,
    ExclamationCircle,
    InformationCircle,
    Icon,
  } from "svelte-heros-v2";

  export let toast;
  export let i;

  onMount(()=>{
    toast.i = i;
    if (toast.level=="success") 
    {
        toast.timer = setTimeout(()=>{remove_toast(i);}, toast.timeout || 10000);
    }
  });

</script>

<div class="toast fixed flex w-full max-w-xs" style="top:{16+i*74}px;" 
    on:click|capture|stopPropagation={()=>{remove_toast(toast.i);}} 
    on:keypress={()=>{}}
    >
    <Toast color="{toast_color[toast.level]}" >
      <Icon tabindex="-1" slot="icon" class="w-8 h-8 p-1 focus:outline-none"  variation="outline" color="currentColor" icon={toast_icon[toast.level]} />
      {toast.text}
    </Toast>
  </div>