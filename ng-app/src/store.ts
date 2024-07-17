// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import {
    writable,
    readable,
    readonly,
    derived,
    get,
    type Writable,
} from "svelte/store";
import { register, init, locale, format } from "svelte-i18n";
import ng from "./api";

let all_branches = {};

// Make sure that a file named `locales/<lang>.json` exists when adding it here.
export const available_languages = {
    en: "English",
    de: "Deutsch",
    fr: "Français",
    ru: "Русский",
    es: "Español",
    it: "Italiano",
    zh: "中文",
    pt: "Português",
};

for (const lang of Object.keys(available_languages)) {
    register(lang, () => import(`./locales/${lang}.json`))
}

init({
    fallbackLocale: "en",
    initialLocale: "en",
});

export const display_error = (error: string) => {
    console.log(error);
    // TODO: Check, if error tranlsation does not exist
    const parts = error.split(":");
    let res = get(format)("errors." + parts[0]);
    if (parts[1]) {
        res += " " + get(format)("errors." + parts[1]);
    }
    return res;
}

export const select_default_lang = async () => {
    let locales = await ng.locales();
    for (let lo of locales) {
        if (available_languages[lo]) {
            // exact match (if locales is a 2 chars lang code, or if we support regionalized translations)
            locale.set(lo);
            return;
        }
        lo = lo.substr(0, 2);
        if (available_languages[lo]) {
            locale.set(lo);
            return;
        }
    }
};

export const scanned_qr_code = writable("");
export const wallet_from_import = writable<null | object>(null);

export const opened_wallets = writable({});

/// { wallet:, id: }
export const active_wallet = writable(undefined);

export const wallets = writable({});

export const connections: Writable<Record<string, any>> = writable({});

export const active_session = writable(undefined);

export const connection_status: Writable<"disconnected" | "connected" | "connecting"> = writable("disconnected");

let next_reconnect: NodeJS.Timeout | null = null;

export const check_has_camera = async () => {
    const tauri_platform: string | undefined = import.meta.env.TAURI_PLATFORM;
    const use_native_cam =
      tauri_platform === "ios" || tauri_platform === "android";
    
    let has_camera: boolean | "checking" = "checking";

    if (!use_native_cam) {
      if (tauri_platform) {
        has_camera = false;
      }
      else {
        // If there is a camera, go to scan mode, else gen mode.
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            has_camera =
            devices.filter((device) => device.kind === "videoinput").length > 0;
        } catch {
            has_camera = false;
        }
      }

    } else {
      // TODO: There does not seem to be an API for checking, if the native device
      //  really supports cameras, as far as I can tell?
      // https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/barcode-scanner/guest-js/index.ts
      has_camera = true;
    }
    return has_camera;
  };

const updateConnectionStatus = ($connections: Record<string, any>) => {
    // Reset error state for PeerAlreadyConnected errors.
    Object.entries($connections).forEach(([cnx, connection]) => {
        if (connection.error === "PeerAlreadyConnected") {
            connections.update(c => {
                c[cnx].error = undefined;
                return c;
            });
        }
    });

    // Check if any connection is active.
    const is_connected = Object.values($connections).some(connection => !connection.error);

    // Check if any connection is connecting.
    const is_connecting = Object.values($connections).some(connection => connection.connecting);

    // Check, if reconnect is needed.
    const should_reconnect = !is_connecting && (next_reconnect === null) && Object.values($connections).some(
        connection => connection.error === "ConnectionError"
    );
    if (should_reconnect) {
        console.log("will try reconnect in 20 sec");
        next_reconnect = setTimeout(async () => {
            await reconnect();

            next_reconnect = null;
        }, 20000);
    }

    if (is_connected) {
        connection_status.set("connected");
    } else if (is_connecting) {
        connection_status.set("connecting");
    } else {
        connection_status.set("disconnected");
    }
};
connections.subscribe(($connections) => {
    updateConnectionStatus($connections);
});

export const online = derived(connection_status, ($connectionStatus) => $connectionStatus == "connected");

export const cannot_load_offline = writable(false);

if (get(connection_status) == "disconnected" && !import.meta.env.TAURI_PLATFORM) {
    cannot_load_offline.set(true);

    let unsubscribe = connection_status.subscribe(async (value) => {
        if (value != "disconnected") {
            cannot_load_offline.set(false);
            if (value == "connected") {
                unsubscribe();
            }
        } else {
            cannot_load_offline.set(true);
        }
    });
}

export const has_wallets = derived(wallets, ($wallets) => Object.keys($wallets).length);



export const set_active_session = function(session) {
    active_session.set(session);
};

export { writable, readonly, derived };

export const close_active_wallet = async function() {
    if (next_reconnect) {
        clearTimeout(next_reconnect);
        next_reconnect = null;
    }
    await close_active_session();
    active_wallet.update((w) => {
        delete w.wallet;
        return w;
    });
    // this will also trigger the removal of the wallet from opened_wallets, and will close the wallet in all tabs.
}

export const close_active_session = async function() {

    let session = get(active_session);
    //console.log("close_active_session",session);
    if (!session) return;

    await ng.session_stop(session.user);

    connections.set({});

    active_session.set(undefined);
    //console.log("setting active_session to undefined",get(active_session));

    for (const branch of Object.keys(all_branches)) {
        let sub = all_branches[branch];
        sub.unsubscribe();
    }

}

const can_connect = derived([active_wallet, active_session], ([$s1, $s2]) => [
    $s1,
    $s2,
]);

export const reconnect = async function() {
    if (next_reconnect) {
        clearTimeout(next_reconnect);
        next_reconnect = null;
    }
    if (!get(active_session)) {
        return;
    }
    console.log("attempting to connect...");
    if (!get(online)) connection_status.set("connecting");
    try {
        let info = await ng.client_info()
        //console.log("Connecting with",get(active_session).user);
        connections.set(await ng.user_connect(
            info,
            get(active_session).user,
            location.href
        ));
    } catch (e) {
        console.error(e)
    }
}
// export const disconnections_subscribe = async function() {
//     let disconnections_unsub = await ng.disconnections_subscribe(async (user_id) => {
//         console.log("DISCONNECTION FOR USER", user_id);
//         connections.update((c) => {
//             c[user_id].error = "ConnectionError";
//             c[user_id].since = new Date();
//             return c;
//         });
//     });
// }
let disconnections_unsub;

export const disconnections_subscribe = async function() {
    if (!disconnections_unsub) {
        await ng.disconnections_subscribe(async (user_id) => {
            console.log("DISCONNECTION FOR USER", user_id);
            connections.update((c) => {
                c[user_id].error = "ConnectionError";
                c[user_id].since = new Date();
                return c;
            });
        });
        disconnections_unsub = true;
    }
}




readable(false, function start(set) {

    return function stop() {
        disconnections_unsub();
    };
});

can_connect.subscribe(async (value) => {
    if (value[0] && value[0].wallet && value[1]) {

        await reconnect();
    }
});

export const branch_subs = function(nuri) {
    // console.log("branch_commits")
    // const { subscribe, set, update } = writable([]); // create the underlying writable store

    // let unsub = () => {};
    // return {
    //     load: async ()  => {
    //         console.log("load")
    //         unsub = await ng.doc_sync_branch(nuri, async (commit) => {
    //             console.log(commit);
    //             update( (old) => {old.unshift(commit); return old;} )
    //         });
    //     },
    //     subscribe: (run, invalid) => {
    //         console.log("sub")
    //         let upper_unsub = subscribe(run, invalid);

    //         return () => {
    //             upper_unsub();
    //             unsub();
    //         }
    //     }
    // // set: (value) => {
    // //   localStorage.setItem(key, toString(value)); // save also to local storage as a string
    // //   return set(value);
    // // },
    // // update,
    // };


    return {
        load: async () => {
            //console.log("load upper");
            let already_subscribed = all_branches[nuri];
            if (!already_subscribed) return;
            if (already_subscribed.load) {
                //console.log("doing the load");
                let loader = already_subscribed.load;
                already_subscribed.load = undefined;
                // already_subscribed.load2 = loader;
                await loader();
            }
        },
        subscribe: (run, invalid) => {
            let already_subscribed = all_branches[nuri];
            if (!already_subscribed) {
                const { subscribe, set, update } = writable([]); // create the underlying writable store
                let count = 0;
                let unsub = () => { };
                already_subscribed = {
                    load: async () => {
                        try {
                            //console.log("load down");
                            let session = get(active_session);
                            if (!session) {
                                console.error("no session");
                                return;
                            }
                            unsub();
                            unsub = () => { };
                            set([]);
                            let req = await ng.doc_fetch_repo_subscribe(nuri);
                            req.V0.session_id = session.session_id;
                            unsub = await ng.app_request_stream(req,
                                async (commit) => {
                                    //console.log("GOT APP RESPONSE", commit);
                                    if (commit.V0.State) {
                                        for (const file of commit.V0.State.files) {
                                            update((old) => { old.unshift(file); return old; })
                                        }
                                    } else if (commit.V0.Patch.other?.FileAdd) {
                                        update((old) => { old.unshift(commit.V0.Patch.other.FileAdd); return old; })
                                    }
                                });
                        }
                        catch (e) {
                            console.error(e);
                        }
                        // this is in case decrease has been called before the load function returned.
                        if (count == 0) { unsub(); }
                    },
                    increase: () => {
                        count += 1;
                        //console.log("increase sub to",count);
                        return readonly({ subscribe });
                    },
                    decrease: () => {
                        count -= 1;
                        //console.log("decrease sub to",count);
                        // if (count == 0) {
                        //     unsub();
                        //     console.log("removed sub");
                        //     delete all_branches[nuri];
                        // }
                    },
                    unsubscribe: () => {
                        unsub();
                        console.log("unsubscribed ", nuri);
                        delete all_branches[nuri];
                    }
                }
                all_branches[nuri] = already_subscribed;
            }

            let new_store = already_subscribed.increase();
            let read_unsub = new_store.subscribe(run, invalid);
            return () => {
                read_unsub();
                //console.log("callback unsub");
                already_subscribed.decrease();
            }

        }
    }
};

let blob_cache = {};
export async function get_blob(ref: { nuri: string; reference: { key: any; id: any; }; }) {
    if (!ref) return false;
    const cached = blob_cache[ref.nuri];
    if (cached) {
        return cached;
    }
    let prom = new Promise(async (resolve) => {
        try {
            let nuri = {
                target: "PrivateStore",
                entire_store: false,
                access: [{ Key: ref.reference.key }],
                locator: [],
                object: ref.reference.id,
            };

            let file_request = {
                V0: {
                    command: "FileGet",
                    nuri,
                    session_id: get(active_session).session_id,
                },
            };

            let final_blob;
            let content_type;
            let unsub = await ng.app_request_stream(file_request, async (blob) => {
                //console.log("GOT APP RESPONSE", blob);
                if (blob.V0.FileMeta) {
                    content_type = blob.V0.FileMeta.content_type;
                    final_blob = new Blob([], { type: content_type });
                } else if (blob.V0.FileBinary) {
                    if (blob.V0.FileBinary.byteLength > 0) {
                        final_blob = new Blob([final_blob, blob.V0.FileBinary], {
                            type: content_type,
                        });
                    }
                } else if (blob.V0 == "EndOfStream") {
                    var imageUrl = URL.createObjectURL(final_blob);
                    resolve(imageUrl);
                }
            });
        } catch (e) {
            console.error(e);
            resolve(false);
        }
    });
    blob_cache[ref.nuri] = prom;
    return prom;
}

//export default branch_commits;