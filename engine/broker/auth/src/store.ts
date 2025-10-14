// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import {
    writable,
    readable,
    readonly,
    derived,
    get,
    type Writable,
} from "svelte/store";

import { createAsyncProxy } from "async-proxy";
import { RemoteReadableStream } from 'remote-web-streams';

export const manifest = writable<undefined | Object>( undefined );

// import worker_ from "./worker.js?worker&inline";
// const worker = new worker_();
