import {
    default as ng,
  } from "./api";

  onmessage = (e) => {
    console.log("Message received by worker", e.data);
    (async function() {
      try {
        let secret_wallet = await ng.wallet_open_wallet_with_pazzle(
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

  