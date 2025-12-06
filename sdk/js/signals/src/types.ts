// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { Patch } from "./connector/applyPatches.ts";

/** The shape of an object requested. */
export type Shape = "Shape1" | "Shape2" | "TestShape";

/** The Scope of a shape request */
export type Scope = string;

/** The diff format used to communicate updates between wasm-land and js-land. */
export type Diff = Patch[];

/** A connection established between wasm-land and js-land for subscription of a shape. */
export type Connection = {
    id: string;
    onUpdateFromWasm: (diff: Diff) => void;
};
