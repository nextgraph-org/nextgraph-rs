<!--
// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
    Cube,
    GlobeAlt,
    QuestionMarkCircle,
    DevicePhoneMobile,
    ComputerDesktop,
    ServerStack,
    Key,
    CommandLine,
  } from "svelte-heros-v2";

  export let config = {};
  export let device: string;

  const mapping = {
    Web: GlobeAlt,
    NativeIos: DevicePhoneMobile,
    NativeAndroid: DevicePhoneMobile,
    NativeMacOS: ComputerDesktop,
    NativeLinux: ComputerDesktop,
    NativeWin: ComputerDesktop,
    NativeService: ServerStack,
    NodeService: ServerStack,
    Verifier: ServerStack,
    VerifierLocal: ServerStack,
    ClientBroker: ServerStack,
    WalletMaster: ServerStack,
    Box: Cube,
    Stick: Key, // VerifierStick
    Cli: CommandLine,
  };

  const find = (dataClass: string) => {
    return mapping[dataClass] || QuestionMarkCircle;
  };
</script>

<Icon {...config} variation="outline" color="black" icon={find(device)} />
