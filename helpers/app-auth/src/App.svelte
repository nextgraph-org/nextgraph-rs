<!--
// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
  import {wrap} from 'svelte-spa-router/wrap';
  import { isLoading } from "svelte-i18n";

  import { onMount, tick, onDestroy } from "svelte";
  import ng from "@nextgraph-monorepo/common/api";
  import { 
    NotFound,
    WalletLogin,
    WalletInfo,
    User,
    Install,
    ScanQRWeb,
    AccountInfo,
    WalletLoginUsername,
    WalletLoginQr,
    WalletLoginTextCode
  } from "@nextgraph-monorepo/common/routes";
  import {     
    wallets,
    active_wallet,
    opened_wallets,
    close_active_session,
    disconnections_subscribe,
    active_session
  } from "@nextgraph-monorepo/common/store";

  // import { select_default_lang } from "@nextgraph-monorepo/common/lang";

  import Home from "./routes/Home.svelte";

  const routes = new Map();
  routes.set("/", Home);
  routes.set("/wallet/login",wrap({
        component: WalletLogin,
        props: {
          without_create: true
        }
    })
  );
  routes.set("/wallet/username", WalletLoginUsername);
  routes.set("/wallet/login-qr", WalletLoginQr);
  routes.set("/wallet/login-text-code", WalletLoginTextCode);
  routes.set("/user", User);
  routes.set("/wallet", WalletInfo);
  routes.set("/user/accounts", AccountInfo);
  routes.set("/scanqr", ScanQRWeb);
  routes.set("*", NotFound);

  let unsubscribe = () => {};
  let unsubscribe_session = () => {};

  let wallet_channel;
  let unsub_main_close;

  // window.refresh_wallets = async () => {
  //   let walls = await ng.get_wallets();
  //   wallets.set(walls);
  // };

  onMount(async () => {

    window.document.getElementById("splash").className="noshow";
    window.document.getElementById("app").className="";
    
    //window.document.getElementById("splash").className="splash-loaded";
    try {
      await disconnections_subscribe();
    } catch (e) {
      console.warn(e);
      //console.log("called disconnections_subscribe twice");
    }

      // ON WEB CLIENTS
      window.addEventListener("storage", async (event) => {
        //console.log("localStorage event", event);
        if (event.storageArea != localStorage) return;
        if (event.key === "ng_wallets") {
          //console.log("localStorage", JSON.stringify($wallets));
          await ng.wallets_reload();
          wallets.set(await ng.get_wallets());
          //console.log("localStorage after", JSON.stringify($wallets));
        }
      });
      wallets.set(await ng.get_wallets());
      // TODO: check the possibility of XS-Leaks. I don't see any, but it should be checked
      // https://github.com/privacycg/storage-partitioning
      // https://github.com/whatwg/html/issues/5803
      // https://w3cping.github.io/privacy-threat-model/
      // https://chromium.googlesource.com/chromium/src/+/fa17a6142f99d58de533d65cd8f3cd0e9a8ee58e
      // https://bugs.webkit.org/show_bug.cgi?id=229814
      wallet_channel = new BroadcastChannel("ng_wallet");
      window.wallet_channel = wallet_channel;
      wallet_channel.postMessage({ cmd: "startup" }, location.href);
      wallet_channel.onmessage = async (event) => {
        // console.log(event.data.cmd, event.data);
        if (!location.href.startsWith(event.origin)) return;
        switch (event.data.cmd) {
          case "startup":
            for (let saved_id of Object.keys($wallets)) {
              if ($wallets[saved_id].in_memory) {
                wallet_channel.postMessage(
                  {
                    cmd: "new_in_mem",
                    name: saved_id,
                    lws: $wallets[saved_id],
                  },
                  location.href
                );
              }
            }
            // if ($active_wallet && $active_wallet.wallet) {
            //   wallet_channel.postMessage(
            //     { cmd: "opened", wallet: $active_wallet },
            //     location.href
            //   );
            // }
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
              //await tick();
              // console.log(
              //   "ADDING TO OPENED",
              //   event.data.wallet.id,
              //   JSON.stringify($opened_wallets),
              //   event.data.wallet.wallet
              // );
              if (event.data.ng_wallets) {
                localStorage.setItem("ng_wallets", event.data.ng_wallets);
                await ng.wallets_reload();
                wallets.set(await ng.get_wallets());
              }
              try {
                await ng.wallet_was_opened(event.data.wallet.wallet);
              } catch (e) {
                console.error(e);
              }
              opened_wallets.update((w) => {
                w[event.data.wallet.id] = event.data.wallet.wallet;
                return w;
              });
            }
            break;
          case "new_in_mem":
            //console.log("GOT new_in_mem", event.data);
            if (event.data.lws) {
              if (!$wallets[event.data.name]) {
                await ng.add_in_memory_wallet(event.data.lws);
                wallets.update((w) => {
                  w[event.data.name] = event.data.lws;
                  return w;
                });
              }
            }
            if (event.data.opened) {
              if (!$opened_wallets[event.data.name]) {
                await ng.wallet_was_opened(event.data.opened);
                opened_wallets.update((w) => {
                  w[event.data.name] = event.data.opened;
                  return w;
                });
              }
            }
            break;
          case "closed":
            opened_wallets.update((w) => {
              delete w[event.data.walletid];
              return w;
            });
            await ng.wallet_close(event.data.walletid);
            if ($active_wallet && $active_wallet.id == event.data.walletid) {
              await close_active_session();
              active_wallet.set(undefined);
              push("#/wallet/login");
            }
            break;
        }
      };
      unsubscribe = active_wallet.subscribe(async (value) => {
        if (value) {
          if (value.wallet) {
            //(<any>window).ng_status_callback.write({status:"loggedin"});
            opened_wallets.update((w) => {
              w[value.id] = value.wallet;
              return w;
            });
            //await tick();
            //console.log("posting opened");
            wallet_channel.postMessage(
              {
                cmd: "opened",
                wallet: value,
                ng_wallets: localStorage.getItem("ng_wallets"),
              },
              location.href
            );
          } else {
            //(<any>window).ng_status_callback.write({status:"loggedout"});
            wallet_channel.postMessage(
              { cmd: "closed", walletid: value.id },
              location.href
            );
            active_wallet.set(undefined);
            await ng.wallet_close(value.id);
            //active_session.set(undefined);
            opened_wallets.update((w) => {
              delete w[value.id];
              return w;
            });
            push("#/wallet/login");
          }
        } else {
        }
      });
    
      unsubscribe_session = active_session.subscribe(async (value) => {
        //console.log("active_session has changed", value)
        if (value) {
          if ((<any>window).ng_status_callback) {
            //console.log("writing loggedin to callback");
            (<any>window).ng_status_callback.write({status:"loggedin", session:value});
          }
        } else {
          if ((<any>window).ng_status_callback) {
            console.log("writing loggedout to callback");
            (<any>window).ng_status_callback.write({status:"loggedout"});
          }
        }
      });
  });

  onDestroy(() => {
    unsubscribe();
    unsubscribe_session();
    if (unsub_main_close) unsub_main_close();
  });

  // import { to_debug } from "./wallet_emojis";
  // to_debug();
</script>

<!-- <p>
  {!$active_session}
  {JSON.stringify(Object.keys($wallets))}
  {JSON.stringify($active_wallet)}
  {JSON.stringify(Object.keys($opened_wallets))}
  {JSON.stringify($active_session)}
</p> -->

{#if $isLoading}
  <p class="text-center">Loading translations...</p>
{:else}
  <Router {routes} />
{/if}
