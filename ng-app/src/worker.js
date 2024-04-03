import * as api from "ng-sdk-js";
import { default as ng } from "./api";

//console.log("loaded worker");

onmessage = (e) => {
  //console.log("Message received by worker", e.data);
  (async function() {
    try {
      let secret_wallet = await ng.wallet_open_with_pazzle(
          e.data.wallet,
          e.data.pazzle,
          e.data.pin_code
      );
      postMessage({success:secret_wallet});
    } catch (e) {
      postMessage({error:e});
    }
  })();
};

postMessage({loaded:true});

  