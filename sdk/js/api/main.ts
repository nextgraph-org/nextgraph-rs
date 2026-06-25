// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
import {createAsyncProxy} from "async-proxy";

let proxy = null;
let waiter = null;

export const api = createAsyncProxy({},{
    async apply(target, path, caller, args) {
        if (proxy) {
            //console.log("calling ",path, args);
            return Reflect.apply(proxy[path], caller, args)
        }
        else
            throw new Error("You must call init_api() before using the API. load an API from native-api or @ng-org/api-web");
    }
});

export default api;

export const init_api = function (api, promise) {
    proxy = api;
    waiter = promise;
}

export const wait_api = async function () {
    if (waiter) {
        await waiter;
    }
}