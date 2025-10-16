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

export const selected_broker = writable<undefined | Object>( undefined );

export const brokers_info = writable( {} );

export const unlocked_wallet = writable(undefined);

export const web_origin = writable("");

import worker_ from "./worker.js?worker&inline";
const worker = new worker_();

async function rpc( method:string, args?: any) : Promise<any> {
    const { readable, writablePort } = new RemoteReadableStream();
    worker.postMessage({ method, args, port: writablePort }, [writablePort]);
    const reader = readable.getReader();
    let ret = await reader.read();
    await reader.read(); // the close.
    return ret.value;
}

const handler = {
    async apply(_target: object, path: PropertyKey[], _caller: any, args?: any) :Promise<any> {
      
      if (path[0] === "login") {

      } else {
        return await rpc(<string>path[0], args);
      }
    }
  };
  
export const ng = createAsyncProxy({}, handler);