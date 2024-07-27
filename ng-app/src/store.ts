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
import { persistent_error, update_class, update_branch_display, open_branch, tab_update, change_nav_bar, cur_branch, cur_tab } from "./tab";
import { encode } from "./base64url";

let all_branches = {};
let retry_branches = {};

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
/**
 * { 
 *      level:"error",//"warning","success","info"
 *      text: ""
 * }
 */
export const toasts = writable([
    // {
    //     level:"error",
    //     text: "this is a serious error",
    // },
    // {
    //     level:"info",
    //     text: "this is an information for you that is very long long long and so long it doesnt fit",
    // },
    // {
    //     level:"warning",
    //     text: "this is a warning. be warned!",
    // },
    // {
    //     level:"success",
    //     text: "this is a success story",
    //     timeout: 5000,
    // }
    
]);

export const remove_toast = function(idx) {
    toasts.update((old)=>{
        old.splice(idx,1);
        return old;
    });
}

export const toast = function(level, text) {
    toasts.update((old)=>{
        old.push({level,text});
        return old;
    });
}

export const reset_toasts = function() {
    toasts.update((old)=>{
        return [];
    });
}

export const toast_error = (text) => {
    toast("error", text);
}

export const toast_info = (text) => {
    toast("info", text);
}

export const toast_warning = (text) => {
    toast("warning", text);
}

export const toast_success = (text) => {
    toast("success", text);
}

export const scanned_qr_code = writable("");
export const wallet_from_import = writable<null | object>(null);

export const opened_wallets = writable({});

/// { wallet:, id: }
export const active_wallet = writable(undefined);

export const wallets = writable({});

export const connections: Writable<Record<string, any>> = writable({});

export const active_session = writable(undefined);

export const redirect_after_login = writable(undefined);

export const connection_status: Writable<"disconnected" | "connected" | "connecting" | "starting"> = writable("starting");

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

const updateConnectionStatus = async ($connections: Record<string, any>) => {
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
        cannot_load_offline.set(false);
        for (const retry of Object.entries(retry_branches)) {
            if (!await retry[1]()) {
                delete retry_branches[retry[0]];
            }
        }
    } else if (is_connecting) {
        connection_status.set("connecting");
    } else if (Object.keys($connections).length) {
        connection_status.set("disconnected");
        if (get(cannot_load_offline) === undefined) {
            cannot_load_offline.set(true);
        }
        for (const retry of Object.entries(retry_branches)) {
            if (!await retry[1]()) {
                delete retry_branches[retry[0]];
            }
        }
    } else {
        connection_status.set("starting");
    }
};
connections.subscribe(async ($connections) => {
    await updateConnectionStatus($connections);
});

export const online = derived(connection_status, ($connectionStatus) => $connectionStatus == "connected");

export const cannot_load_offline = writable(undefined);

// if (get(connection_status) == "disconnected" && !import.meta.env.TAURI_PLATFORM) {
//     cannot_load_offline.set(true);

//     let unsubscribe = connection_status.subscribe(async (value) => {
//         if (value != "disconnected") {
//             cannot_load_offline.set(false);
//             if (value == "connected") {
//                 unsubscribe();
//             }
//         } else {
//             cannot_load_offline.set(true);
//         }
//     });
// }

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
    retry_branches = {};

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
        //console.error(e)
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
        //setTimeout(async()=> {await reconnect();},5000);
        await reconnect();
    }
});

export const digest_to_string = function(digest) {
    let copy = [...digest.Blake3Digest32];
    copy.reverse();
    copy.push(0);
    let buffer = Uint8Array.from(copy);
    return encode(buffer.buffer);
};

export const sparql_query = async function(sparql:string, union:boolean) {
    let session = get(active_session);
    if (!session) {
        throw new Error("no session");
    }
    let nuri = union ? undefined : "did:ng:"+get(cur_tab).branch.nuri;
    return await ng.sparql_query(session.session_id, sparql, nuri);
}

export const sparql_update = async function(sparql:string) {
    let session = get(active_session);
    if (!session) {
        throw new Error("no session");
    }
    let nuri = "did:ng:"+get(cur_tab).branch.nuri;
    await ng.sparql_update(session.session_id, sparql, nuri);
}

export const branch_subscribe = function(nuri:string, in_tab:boolean) {
    //console.log("branch_subscribe", nuri)
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

    open_branch(nuri, in_tab);


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
                if (await loader()) {
                    retry_branches[nuri] = loader;
                }
            }
        },
        subscribe: (run, invalid) => {
            //console.log("sub");
            let already_subscribed = all_branches[nuri];
            if (!already_subscribed) {
                const { subscribe, set, update } = writable({graph:[], discrete:[], files:[], history: false, heads: []}); // create the underlying writable store
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
                 
                            persistent_error(nuri, false);
                            
                            let req = await ng.doc_fetch_repo_subscribe("did:ng:"+nuri);
                            req.V0.session_id = session.session_id;
                            unsub = await ng.app_request_stream(req,
                                async (response) => {
                                    console.log("GOT APP RESPONSE", response);
                                    if (response.V0.TabInfo) {
                                        tab_update(nuri, ($cur_tab) => {
                                            if (response.V0.TabInfo.branch?.id) {
                                                //console.log("BRANCH ID",response.V0.TabInfo.branch?.id);
                                                $cur_tab.branch.id = response.V0.TabInfo.branch.id;
                                            }
                                            if (response.V0.TabInfo.branch?.class) {
                                                $cur_tab = update_class($cur_tab, response.V0.TabInfo.branch.class);
                                            }
                                            if (response.V0.TabInfo.branch?.readcap) {
                                                $cur_tab.branch.readcap = response.V0.TabInfo.branch.readcap;
                                            }
                                            if (response.V0.TabInfo.doc?.nuri) {
                                                $cur_tab.doc.nuri = response.V0.TabInfo.doc.nuri;
                                            }
                                            if (response.V0.TabInfo.doc?.can_edit) {
                                                $cur_tab.doc.can_edit = response.V0.TabInfo.doc.can_edit;
                                            }
                                            if (response.V0.TabInfo.doc?.is_store) {
                                                $cur_tab.doc.is_store = response.V0.TabInfo.doc.is_store;
                                            }
                                            if (response.V0.TabInfo.doc?.is_member) {
                                                $cur_tab.doc.is_member = response.V0.TabInfo.doc.is_member;
                                            }
                                            if (response.V0.TabInfo.store?.overlay) {
                                                $cur_tab.store.overlay = response.V0.TabInfo.store.overlay;
                                            }
                                            if (response.V0.TabInfo.store?.store_type) {
                                                
                                                if (get(cur_branch) == nuri) {
                                                    change_nav_bar(`nav:${response.V0.TabInfo.store.store_type}`,get(format)(`doc.${response.V0.TabInfo.store.store_type}_store`), undefined); 
                                                }
                                               
                                                $cur_tab.store.store_type = response.V0.TabInfo.store.store_type;
                                                
                                            }
                                            update_branch_display($cur_tab);
                                            return $cur_tab;
                                        });
                                    } 
                                    else update((old) => {
                                        if (response.V0.State) {
                                            for (const head of response.V0.State.heads) {
                                                let commitId = digest_to_string(head);
                                                old.heads.push(commitId);
                                            }
                                            for (const file of response.V0.State.files) {
                                                old.files.unshift(file);
                                            }
                                            if (response.V0.State.graph) {
                                                for (const triple of response.V0.State.graph.triples){
                                                    // TODO: detect ng:a ng:i ng:n and update the tab accordingly
                                                    old.graph.push(triple);
                                                }
                                                old.graph.sort();
                                            }
                                        } else if (response.V0.Patch) {
                                            let i = old.heads.length;
                                            while (i--) {
                                                if (response.V0.Patch.commit_info.past.includes(old.heads[i])) {
                                                    old.heads.splice(i, 1);
                                                }
                                            }
                                            old.heads.push(response.V0.Patch.commit_id);
                                            if (old.history!==false) {
                                                let commit = [response.V0.Patch.commit_id, response.V0.Patch.commit_info];
                                                if (old.history === true) {
                                                    old.history = [commit];
                                                } else {
                                                    old.history.push(commit);
                                                }
                                            }
                                            if (response.V0.Patch.graph) {
                                                let duplicates = [];
                                                for (let i = 0; i < old.graph.length; i++) {
                                                    if (response.V0.Patch.graph.inserts.includes(old.graph[i])) {
                                                        duplicates.push(old.graph[i])
                                                    } else
                                                    if (response.V0.Patch.graph.removes.includes(old.graph[i])) {//TODO: optimization: remove this triple from the removes list.
                                                        old.graph.splice(i, 1);
                                                    }
                                                }
                                                for (const insert of response.V0.Patch.graph.inserts){
                                                    // TODO: detect ng:a ng:i ng:n and update the tab accordingly
                                                    if (!duplicates.includes(insert)) {
                                                        old.graph.push(insert);
                                                    }
                                                }
                                                old.graph.sort();
                                            } else if (response.V0.Patch.other?.FileAdd) {
                                                old.files.unshift(response.V0.Patch.other.FileAdd);
                                            } else {

                                            }
                                        }
                                        return old;
                                    });
                                });
                        }
                        catch (e) {
                            if (e=="RepoNotFound") {
                                let cnx_status = get(connection_status);
                                if (cnx_status=="connected" || cnx_status=="disconnected") {
                                    persistent_error(nuri, {
                                        title: get(format)("doc.not_found"),
                                        desc: get(format)(cnx_status=="disconnected"?"doc.not_found_details_offline":"doc.not_found_details_online")
                                    });
                                }
                                if (cnx_status!="connected") return true; 
                            } else if (e=="InvalidNuri" || e=="InvalidKey") {
                                persistent_error(nuri, {
                                    title: get(format)("doc.errors.InvalidNuri"),
                                    desc: get(format)("doc.errors_details.InvalidNuri")
                                });
                            } else {
                                console.error(e);
                                // TODO: display persistent_error
                            }
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