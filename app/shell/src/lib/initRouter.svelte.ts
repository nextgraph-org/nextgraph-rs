// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { initCore } from "@svelte-router/core";
import { CustomLocationLite } from "./CustomLocationLite.svelte";
import { ROOT_COMPONENT_ID } from "./shellContext.svelte";

export function init({
  defaultHash = ROOT_COMPONENT_ID,
}: {
  defaultHash?: string;
}) {
  const routingOptions = { defaultHash, hashMode: "multi" as const };

  initCore(new CustomLocationLite(undefined, routingOptions), routingOptions);
}
