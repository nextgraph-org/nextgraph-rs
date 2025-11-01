
import {wallets, active_wallet, opened_wallets, close_active_session} from "./store";
import {init_api} from "../.auth-react/api";
import {default as web_api} from "../../../../sdk/js/api-web";
import { default as ng } from "../.auth-react/api";
import { get } from "svelte/store";

let unsubscribe = () => {};

let wallet_channel;

export const bootstrap_web = async function() {
    console.log("web store initializing")
    init_api(web_api);

    // ON WEB CLIENTS
    window.addEventListener("storage", async (event) => {
        console.log("localStorage event", event);
        if (event.storageArea != localStorage) return;
        if (event.key === "ng_wallets") {
            //console.log("localStorage", JSON.stringify($wallets));
            await ng.wallets_reload();
            wallets.set(await ng.get_wallets());
            //console.log("localStorage after", JSON.stringify($wallets));
        }
    });
    let wals = await ng.get_wallets();
    wallets.set(wals);

    // wallets.update((old)=> { 
    //     console.log(old)
    //     for (const m of wals.entries()) {
    //         console.log("setting",m[0],m[1])
    //         old[m[0]]=m[1];
    //     }
    //     console.log(old)
    //     return old;
    // });
    // TODO: check the possibility of XS-Leaks. I don't see any, but it should be checked
    // https://github.com/privacycg/storage-partitioning
    // https://github.com/whatwg/html/issues/5803
    // https://w3cping.github.io/privacy-threat-model/
    // https://chromium.googlesource.com/chromium/src/+/fa17a6142f99d58de533d65cd8f3cd0e9a8ee58e
    // https://bugs.webkit.org/show_bug.cgi?id=229814
    wallet_channel = new BroadcastChannel("ng_wallet");
    window.wallet_channel = wallet_channel;
    wallet_channel.postMessage({ cmd: "startup" }, location.origin);
    wallet_channel.onmessage = async (event) => {
    // console.log(event.data.cmd, event.data);
    if (!location.href.startsWith(event.origin)) return;
    switch (event.data.cmd) {
        case "startup":
        for (let saved_id of Object.keys(get(wallets))) {
            if (wallets[saved_id]?.in_memory) {
            wallet_channel.postMessage(
                {
                cmd: "new_in_mem",
                name: saved_id,
                lws: get(wallets)[saved_id],
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
        for (let opened of Object.keys(get(opened_wallets))) {
            wallet_channel.postMessage(
            {
                cmd: "opened",
                wallet: { wallet: get(opened_wallets)[opened], id: opened },
            },
            location.href
            );
        }

        break;
        case "opened":
        if (!get(opened_wallets)[event.data.wallet.id]) {
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
            if (!get(wallets)[event.data.name]) {
            await ng.add_in_memory_wallet(event.data.lws);
            wallets.update((w) => {
                w[event.data.name] = event.data.lws;
                return w;
            });
            }
        }
        if (event.data.opened) {
            if (!get(opened_wallets)[event.data.name]) {
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
        if (get(active_wallet) && get(active_wallet).id == event.data.walletid) {
            await close_active_session();
            active_wallet.set(undefined);
            //TODO push("#/wallet/login");
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
            console.warn("USER PRIV_KEY: ",await ng.privkey_to_string(value.wallet.V0.sites[value.wallet.V0.personal_site_id].site_type.Individual[0]));
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
            //TODO push("#/wallet/login");
        }
    } 
    });
}
