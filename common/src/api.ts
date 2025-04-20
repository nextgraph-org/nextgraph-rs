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

let api = createAsyncProxy({},{
    async apply(target, path, caller, args) {
        if (proxy) {
            //console.log("calling ",path, args);
            return Reflect.apply(proxy[path], caller, args)
        }
        else
            throw new Error("You must call init_api() before using the API. load an API from @nextgraph-monorepo/app_api_tauri or @nextgraph-monorepo/app_api_web");
    }
});

export default api;

export const NG_EU_BSP = "https://nextgraph.eu";
export const NG_EU_BSP_REGISTER = import.meta.env.PROD
? "https://account.nextgraph.eu/#/create"
: "http://account-dev.nextgraph.eu:5173/#/create";

export const NG_NET_BSP = "https://nextgraph.net";
export const NG_NET_BSP_REGISTER = import.meta.env.PROD
? "https://account.nextgraph.net/#/create"
: "http://account-dev.nextgraph.net:5173/#/create";

export const APP_ACCOUNT_REGISTERED_SUFFIX = "/#/user/registered";
export const APP_WALLET_CREATE_SUFFIX = "/#/wallet/create";

export const LINK_NG_BOX = "https://nextgraph.org/ng-box/";
export const LINK_SELF_HOST = "https://nextgraph.org/self-host/";

export const init_api = function (a) {
    proxy = a;
}
