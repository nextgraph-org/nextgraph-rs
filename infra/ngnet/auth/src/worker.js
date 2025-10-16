// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//import * as sdk from "@ng-org/wasm-tools-auth";
import { fromWritablePort } from 'remote-web-streams';

self.onmessage = (event) => {
    (async function() {
        const { method, args, port } = event.data;
        const writable = fromWritablePort(port);
        const writer = writable.getWriter();
        console.log("Message received by worker", method, args);

        let ret = await Reflect.apply(sdk[method], null, args);
        writer.write(ret);
        writer.close();
    })();
}

console.log("worker loaded");