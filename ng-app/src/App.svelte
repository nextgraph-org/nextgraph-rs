<!--
// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script lang="ts">
  import { push, default as Router } from "svelte-spa-router";
  import { onMount, tick, onDestroy } from "svelte";
  import {
    wallets,
    active_wallet,
    opened_wallets,
    active_session,
  } from "./store";

  import Home from "./routes/Home.svelte";
  import Test from "./routes/Test.svelte";

  import URI from "./routes/URI.svelte";
  import NotFound from "./routes/NotFound.svelte";
  import WalletCreate from "./routes/WalletCreate.svelte";
  import WalletLogin from "./routes/WalletLogin.svelte";
  import UserRegistered from "./routes/UserRegistered.svelte";
  import Install from "./lib/Install.svelte";

  import ng from "./api";

  const routes = new Map();
  routes.set("/", Home);
  routes.set("/test", Test);
  routes.set("/wallet/login", WalletLogin);
  routes.set("/wallet/create", WalletCreate);
  routes.set("/user/registered", UserRegistered);
  if (import.meta.env.NG_APP_WEB) routes.set("/install", Install);
  routes.set(/^\/ng(.*)/i, URI);
  routes.set("*", NotFound);

  let unsubscribe = () => {};

  let wallet_channel;
  let unsub_main_close;

  onMount(async () => {
    let tauri_platform = import.meta.env.TAURI_PLATFORM;
    if (tauri_platform) {
      //console.log(await ng.test());
      let walls = await ng.get_wallets_from_localstorage();
      wallets.set(walls);

      let window_api = await import("@tauri-apps/plugin-window");
      let event_api = await import("@tauri-apps/api/event");
      let main = window_api.Window.getByLabel("main");
      unsub_main_close = await main.onCloseRequested(async (event) => {
        console.log("onCloseRequested main");
        await event_api.emit("close_all", {});
        let registration = window_api.Window.getByLabel("registration");
        if (registration) {
          await registration.close();
        }
        let viewer = window_api.Window.getByLabel("viewer");
        if (viewer) {
          await viewer.close();
        }
      });
    } else {
      window.addEventListener("storage", async (event) => {
        if (event.storageArea != localStorage) return;
        if (event.key === "ng_wallets") {
          wallets.set(await ng.get_wallets_from_localstorage());
        }
      });
      wallets.set(await ng.get_wallets_from_localstorage());
      wallet_channel = new BroadcastChannel("ng_wallet");
      wallet_channel.postMessage({ cmd: "is_opened" }, location.href);
      wallet_channel.onmessage = (event) => {
        console.log(event.data.cmd, event.data);
        if (!location.href.startsWith(event.origin)) return;
        switch (event.data.cmd) {
          case "is_opened":
            if ($active_wallet && $active_wallet.wallet) {
              wallet_channel.postMessage(
                { cmd: "opened", wallet: $active_wallet },
                location.href
              );
            }
            for (let opened of Object.keys($opened_wallets)) {
              wallet_channel.postMessage(
                {
                  cmd: "opened",
                  wallet: { wallet: $opened_wallets[opened], id: opened },
                },
                location.href
              );
            }
            break;
          case "opened":
            if (!$opened_wallets[event.data.wallet.id]) {
              opened_wallets.update((w) => {
                w[event.data.wallet.id] = event.data.wallet.wallet;
                return w;
              });
            }
            break;
          case "closed":
            opened_wallets.update((w) => {
              delete w[event.data.walletid];
              return w;
            });
            if ($active_wallet && $active_wallet.id == event.data.walletid) {
              active_session.set(undefined);
              active_wallet.set(undefined);
              push("#/wallet/login");
            }
            break;
        }
      };
      unsubscribe = active_wallet.subscribe((value) => {
        if (value) {
          if (value.wallet) {
            wallet_channel.postMessage(
              { cmd: "opened", wallet: value },
              location.href
            );
          } else {
            wallet_channel.postMessage(
              { cmd: "closed", walletid: value.id },
              location.href
            );
            active_wallet.set(undefined);
            active_session.set(undefined);
            opened_wallets.update((w) => {
              delete w[value.id];
              return w;
            });
            push("#/wallet/login");
          }
        } else {
        }
      });
    }
  });

  onDestroy(() => {
    unsubscribe();
    if (unsub_main_close) unsub_main_close();
  });
</script>

<main class="">
  <!-- <p>
    {JSON.stringify(Object.keys($wallets))}
    {JSON.stringify($active_wallet)}
    {JSON.stringify(Object.keys($opened_wallets))}
    {JSON.stringify($active_session)}
  </p> -->
  <Router {routes} />
</main>
