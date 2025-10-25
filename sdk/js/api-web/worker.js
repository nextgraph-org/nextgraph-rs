// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import * as ng from "@ng-org/lib-wasm";
//import { default as ng } from "./api";
//import ng from "./main";

//console.log("loaded worker");

onmessage = (e) => {
  //console.log("Message received by worker", e.data);
  (async function() {
    try {
      let secret_wallet;
      if (e.data.pazzle) {
         secret_wallet = await ng.wallet_open_with_pazzle(
            e.data.wallet,
            e.data.pazzle,
            e.data.pin_code
        );
      } else if (e.data.password) {
         secret_wallet = await ng.wallet_open_with_password(
          e.data.wallet,
          e.data.password
        );
      } else if (e.data.mnemonic_words) {
         secret_wallet = await ng.wallet_open_with_mnemonic_words(
          e.data.wallet,
          e.data.mnemonic_words,
          e.data.pin_code
        );
      }
      postMessage({success:secret_wallet});
    } catch (e) {
      postMessage({error:e});
    }
  })();
};

postMessage({loaded:true});

  