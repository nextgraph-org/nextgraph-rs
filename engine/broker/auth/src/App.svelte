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
  import { push, default as Router, querystring } from "svelte-spa-router";
  import {wrap} from 'svelte-spa-router/wrap';
  import { isLoading } from "svelte-i18n";
  import { origin } from "./store";
  import { onMount, tick, onDestroy } from "svelte";
  import ng from "@ng-org/ui-common/api";
  import {worker_ready} from "../../../../sdk/js/api-web";
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
  } from "@ng-org/ui-common/routes";
  import {     
    wallets,
    active_wallet,
    opened_wallets,
    close_active_session,
    disconnections_subscribe,
    active_session
  } from "@ng-org/ui-common/store";

  // import { select_default_lang } from "@ng-org/ui-common/lang";

  import Home from "./routes/Home.svelte";
  import Error from "./routes/Error.svelte";

  const param = new URLSearchParams($querystring);
  let origin_url = decodeURIComponent(param.get("o"));
  let host;
  try {
    //console.log(origin_url);
    host = new URL(origin_url).host;
    //console.log(host);
    document.getElementById("banner").innerText = "Opening Wallet for "+host;
    origin.set(origin_url);
    window.origin_url = origin_url;
  } catch {
    push("#/error");
  }

  let logged_in = false;

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
  routes.set("/error", Error);
  routes.set("*", NotFound);

  let unsubscribe = () => {};
  let unsubscribe_session = () => {};

  let net_auth_iframe;

  let wallet_channel;
  let unsub_main_close;

  // window.refresh_wallets = async () => {
  //   let walls = await ng.get_wallets();
  //   wallets.set(walls);
  // };
  const redirect_server = import.meta.env.NG_REDIR_SERVER || "nextgraph.net";
  const iframe_config =
    import.meta.env.NG_DEV3 ? {src:"http://127.0.0.1:3033/auth/?o=", origin: "http://127.0.0.1:3033"} :
    import.meta.env.DEV ? {src:"http://localhost:14404/?o=", origin: "http://localhost:14404"} :
    import.meta.env.NG_DEV ? {src:"http://localhost:1421/auth.html?o=", origin: "http://localhost:1421"} :
                             {src:`https://${redirect_server}/auth/?o=`, origin: `https://${redirect_server}`} ;

  onMount(async () => {

    window.document.getElementById("splash").className="noshow";
    window.document.getElementById("app").className="";
    
    await worker_ready;

    // try {
    //   await disconnections_subscribe();
    // } catch (e) {
    //   console.warn(e);
    //   //console.log("called disconnections_subscribe twice");
    // }

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
          logged_in = true;
          document.getElementById("banner").innerText = "Wallet opened for "+host;
          let iframe_parent = window.document.getElementById("nextgraph-net-auth-iframe-parent");
          let iframe = window.document.getElementById("nextgraph-net-auth-iframe");
          iframe_parent?.classList.add('nextgraph-net-auth-iframe-parent--active');
          window.document.getElementById("app").style["display"] = "none";
          let origin = window.location.origin;
          let encoded_origin = encodeURIComponent(origin);
          let port;

          const init = () => {
            if (net_auth_iframe && port)
            net_auth_iframe.postMessage({ method: "init", session:value, manifest:{origin:origin_url}, port: port }, iframe_config.origin, [port]);
          };

          iframe.addEventListener("load",  function() {
            net_auth_iframe = this.contentWindow;
            //console.log(net_auth_iframe);
            init();
          });

          const ready_handler = async function(m) {
            //console.log("in 14400/auth got message from", m.origin, m.data, iframe_config.origin);
            if (m.data.ready && m.origin === iframe_config.origin) {
              //remove this listener
              window.removeEventListener("message",ready_handler);
              const { port1, port2 } = new MessageChannel();
              port1.onmessage = async (e) => {
                //console.log("in broker auth got port message", e.data);
                if (e.data.done) {
                  // end of session
                  window.location.href = origin_url;
                } else {
                  const method = e.data.method;
                  const args = e.data.args;
                  const port = e.data.port;
                  if ( e.data.streamed || method === "doc_subscribe" || method === "orm_start" || method === "app_request_stream" || method === "file_get" ) {
                    //console.log("processing streamed request ...",method, args);
                    args.push((callbacked)=> {
                      port.postMessage({stream:true, ret:callbacked});
                    });
                    try {
                      let cancel_function = () => {};
                      port.onmessage = (m) => {
                          if (m.data.close) {
                              port.close();
                              cancel_function();
                              cancel_function = () => {};
                          }
                      };
                      port.onclose = () => {
                          cancel_function();
                          cancel_function = () => {};
                      };
                      cancel_function = await Reflect.apply(ng[method], null, args);
                      port.postMessage({stream:true});
                    } catch (e) {
                      port.postMessage({ok:false, ret:e});
                      port.close();
                    }
                  } else {
                    // forwarding to ng
                    //console.log("processing...",method, args);
                    try {
                      let res = await Reflect.apply(ng[method], null, args);
                      //console.log("got res=",res)
                      port.postMessage({ok:true, ret:res});
                      port.close();
                    } catch (e) {
                      port.postMessage({ok:false, ret:e});
                      port.close();
                    }
                  }
                }
              };
              port = port2;
              init();
              //console.log("sending init message to app-auth");
            } else if (m.data.status == "error" && m.origin === iframe_config.origin) {
              console.error(m.data.error);
              window.location.href = origin_url;
            }
          };
          
          window.addEventListener("message",ready_handler);
          iframe.src = `${iframe_config.src}${encoded_origin}`;
        } else if (logged_in) {
          // we redirect to the unauthenticated origin
          window.location.href = origin_url;
        }
      });
      wallet_channel.postMessage({ cmd: "startup" }, location.href);
      //TODO: remove this 
      //active_session.set({session_id:1});
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
