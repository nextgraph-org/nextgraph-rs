// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
import { persistent_error, update_class, update_branch_display, open_branch, tab_update, change_nav_bar, cur_branch, cur_tab, show_modal_create, 
    save, nav_bar,in_memory_save, cur_doc_popup, show_doc_popup } from "./tab";
import { encode } from "./base64url";
import { RemoteReadableStream } from 'remote-web-streams';

let all_branches = {};
let retry_branches = {};

export const register_bootstrap = async function (bootstrap_iframe_msgs) {
    //console.log("register_bootstrap", bootstrap_iframe_msgs)
    let iframe = (<HTMLIFrameElement>window.document.getElementById('nextgraph-bootstrap-iframe'))?.contentWindow;
    if (!iframe) return false;
    const { readable, writablePort } = new RemoteReadableStream();
    //console.log("adding", bootstrap_iframe_msgs, NG_BOOTSTRAP_IFRAME_ORIGIN)
    iframe.postMessage({ method: "add", port:writablePort, msgs: bootstrap_iframe_msgs}, NG_BOOTSTRAP_IFRAME_ORIGIN, [writablePort]);
    const reader = readable.getReader();
    let ret = await reader.read();
    await reader.read(); // the close
    if (ret.value.status=="ok") return true;
    return ret.value.error
  }

export const test_bootstrap = async function () {
    let iframe = (<HTMLIFrameElement>window.document.getElementById('nextgraph-bootstrap-iframe'))?.contentWindow;
    if (!iframe) return false;
    const { readable, writablePort } = new RemoteReadableStream();
    iframe.postMessage({method:"test", port:writablePort}, NG_BOOTSTRAP_IFRAME_ORIGIN, [writablePort]);
    const reader = readable.getReader();
    let ret = await reader.read();
    await reader.read(); // the close
    if (ret.value.status=="ok") return true;
    else return false;
  }

export const NG_BOOTSTRAP_IFRAME_SRC = import.meta.env.TAURI_PLATFORM ? false : import.meta.env.PROD
    ? "https://nextgraph.net/bootstrap/?o=" + encodeURIComponent(location.origin)
    : "/bootstrap.html?o=" + encodeURIComponent(location.origin);

export const NG_BOOTSTRAP_IFRAME_ORIGIN = import.meta.env.TAURI_PLATFORM ? "" : import.meta.env.PROD
    ? "https://nextgraph.net"
    : location.origin;

// Make sure that a file named `locales/<lang>.json` exists when adding it here.
export const available_languages = {
    en: "English",
    de: "Deutsch",
    //fr: "Français",
    //ru: "Русский",
    //es: "Español",
    //it: "Italiano",
    //zh: "中文",
    //pt: "Português",
};

for (const lang of Object.keys(available_languages)) {
    register(lang, () => import(`./locales/${lang}.json`))
}

init({
    fallbackLocale: "en",
    initialLocale: "en",
});

export const display_error = (error: string) => {
    if (error.message) return error.message;
    if (error.includes(" ")) return error;
    if (error.includes("\"")) return error;
    //console.log(error);
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

export const toasts = writable([
    // {
    //     level:"error",
    //     text: "this is a serious error",
    // },
    // {
    //     level:"success",
    //     text: "this is a success story",
    //     timeout: 5000,
    // },
    // {
    //     level:"info",
    //     text: "this is an information for you that is very long long long and so long it doesnt fit",
    // },
    // {
    //     level:"warning",
    //     text: "this is a warning. be warned!",
    // }
]);

export const remove_toast = function(toast) {
    toasts.update((old)=>{
        for (const [index, value] of old.entries()) {
            if (value.i == toast){
                let t = old.splice(index,1);
                if (t.timer) {clearTimeout(t.timer);}; 
                break;
            }
        }
        return old;
    });
}

export const toast = function(level, text) {
    toasts.update((old)=>{
        old.push({level,text});
        return old;
    });
}

export const reset_toasts = async function() {
    let count = get(toasts).length;
    if (count) {
        toasts.update((old)=>{
            for (let o of old) {
                if (o.timer) clearTimeout(o.timer);
            }
            return [];
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
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

export const openModalCreate = async () => {
    await save();
    await reset_toasts()
    show_modal_create.set(true);
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
export const redirect_if_wallet_is = writable(undefined);

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
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            console.log(devices);
            has_camera =
            devices.filter((device) => device.kind === "videoinput").length > 0;
        } catch(e) {
            console.log(e);
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
        console.log("will try reconnect in 5 sec");
        next_reconnect = setTimeout(async () => {
            await reconnect();

            next_reconnect = null;
        }, 5000);
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
    redirect_after_login.set(undefined);
    redirect_if_wallet_is.set(undefined);
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

export const symkey_to_string = function(key) {
    let copy = [...key.ChaCha20Key];
    copy.reverse();
    copy.push(0);
    let buffer = Uint8Array.from(copy);
    return encode(buffer.buffer);
};

export const discrete_update = async (update, crdt, heads) => {
    if (get(cur_tab).doc.live_edit) {
        await live_discrete_update(update, crdt, heads);
    } else {
        in_memory_save.push(update);
        nav_bar.update((o) => { o.save = true; return o; });
    }
    // if cur_tab.doc.live_edit => send directly to verifier (with live_discrete_update)
    // else, save the update locally with the API. 
    // and nav_bar.update((o) => { o.save = true; return o; });
    // once save button is pressed, we call OnSave with all the updates that we retrieve from local storage (via API). and we set nav_bar.update((o) => { o.save = false; return o; });
    // the editor then process those updates and calls live_discrete_update
}

export const open_doc_popup = async (popup_name) => {
    await reset_toasts();
    cur_doc_popup.set(popup_name);
    show_doc_popup.set(true);  
} 

export const change_header = async (title_, about_) => {
    let session = get(active_session);
    if (!session) {
        persistent_error(get(cur_branch), {
            title: get(format)("doc.errors.no_session"),
            desc: get(format)("doc.errors_details.no_session")
        });
        throw new Error("no session");
    }
    let nuri = "did:ng:"+get(cur_tab).doc.nuri+":"+get(cur_tab).store.overlay;

    let title = undefined;
    let about = undefined;
    if ( get(cur_tab).doc.title != title_ ) {
        title = title_;
    }
    if ( get(cur_tab).doc.description != about_ ) {
        about = about_;
    }
    if (title === undefined && about === undefined) {
        //console.log("identical"); 
        return;
    }
    try {
        await ng.update_header(session.session_id, nuri, title, about);
    }
    catch (e) {
        toast_error(display_error(e));
    }
}

export const live_discrete_update = async (update, crdt, heads) => {
    // send directly to verifier with AppRequest Update
    let session = get(active_session);
    if (!session) {
        persistent_error(get(cur_branch), {
            title: get(format)("doc.errors.no_session"),
            desc: get(format)("doc.errors_details.no_session")
        });
        throw new Error("no session");
    }
    let nuri = "did:ng:"+get(cur_tab).doc.nuri+":"+get(cur_tab).store.overlay;
    await ng.discrete_update(session.session_id, update, heads, crdt, nuri);
}

export const sparql_query = async function(sparql:string, union:boolean) {
    let session = get(active_session);
    if (!session) {
        persistent_error(get(cur_branch), {
            title: get(format)("doc.errors.no_session"),
            desc: get(format)("doc.errors_details.no_session")
        });
        throw new Error("no session");
    }
    let base = "did:ng:"+get(cur_tab).doc.nuri;
    //console.log("BASE",base)
    let nuri = union ? undefined : (base+":"+get(cur_tab).store.overlay);
    return await ng.sparql_query(session.session_id, sparql, base, nuri);
}

export const sparql_update = async function(sparql:string) {
    let session = get(active_session);
    if (!session) {
        persistent_error(get(cur_branch), {
            title: get(format)("doc.errors.no_session"),
            desc: get(format)("doc.errors_details.no_session")
        });
        throw new Error("no session");
    }
    let nuri = "did:ng:"+get(cur_tab).doc.nuri+":"+get(cur_tab).store.overlay;
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

    

    return {
        load: async () => {
            //console.log("load upper");
            await save();
            open_branch(nuri, in_tab);

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
                let onUpdate = (update) => {};
                const { subscribe, set, update } = writable({graph:[], discrete:{updates:[], deregisterOnUpdate:()=>{ onUpdate=()=>{};},registerOnUpdate:(f)=>{ }}, 
                                                             files:[], history: {start:()=>{}, stop:()=>{}, commits:false}, heads: [], head_keys:[]}); // create the underlying writable store // take:()=>{},
                update((old)=> {
                    old.history.start = () => update((o) => {o.history.commits = true; return o;}) ;
                    old.history.stop = () => update((o) => {o.history.commits = false; return o;}) ;
                    old.discrete.registerOnUpdate = (f) => { onUpdate = f; return get({subscribe}).discrete.updates; };
                    //old.history.take = () => { let res: boolean | Array<{}> = false; update((o) => {res = o.history.commits; o.history.commits = []; return o;});  return res;}
                    return old;});
                let count = 0;
                let unsub = () => { };
                already_subscribed = {
                    load: async () => {
                        try {
                            //console.log("load down");
                            let session = get(active_session);
                            if (!session) {
                                persistent_error(get(cur_branch), {
                                    title: get(format)("doc.errors.no_session"),
                                    desc: get(format)("doc.errors_details.no_session")
                                });
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
                                    //console.log("GOT APP RESPONSE", response);
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
                                            if (typeof response.V0.TabInfo.doc?.can_edit === "boolean" ) {
                                                $cur_tab.doc.can_edit = response.V0.TabInfo.doc.can_edit;
                                            }
                                            if (typeof response.V0.TabInfo.doc?.is_store === "boolean") {
                                                $cur_tab.doc.is_store = response.V0.TabInfo.doc.is_store;
                                            }
                                            if (response.V0.TabInfo.doc?.is_member) {
                                                $cur_tab.doc.is_member = response.V0.TabInfo.doc.is_member;
                                            }
                                            if (response.V0.TabInfo.doc?.title !== undefined && response.V0.TabInfo.doc?.title !== null) {
                                                $cur_tab.doc.title = response.V0.TabInfo.doc.title;
                                            }
                                            if (response.V0.TabInfo.doc?.description !== undefined && response.V0.TabInfo.doc?.description !== null) {
                                                $cur_tab.doc.description = response.V0.TabInfo.doc.description;
                                            }
                                            if (response.V0.TabInfo.store?.overlay) {
                                                $cur_tab.store.overlay = response.V0.TabInfo.store.overlay;
                                            }
                                            if (response.V0.TabInfo.store?.repo) {
                                                $cur_tab.store.repo = response.V0.TabInfo.store.repo;
                                            }
                                            if (response.V0.TabInfo.store?.has_outer) {
                                                $cur_tab.store.has_outer = response.V0.TabInfo.store.has_outer;
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
                                            for (const key of response.V0.State.head_keys) {
                                                let key_str = symkey_to_string(key);
                                                old.head_keys.push(key_str);
                                            }
                                            for (const file of response.V0.State.files) {
                                                old.files.unshift(file);
                                            }
                                            if (response.V0.State.graph) {
                                                for (const triple of response.V0.State.graph.triples){
                                                    // TODO: detect ng:a ng:j ng:n and update the tab accordingly
                                                    old.graph.push(triple);
                                                }
                                                old.graph.sort();
                                            }
                                            if (response.V0.State.discrete) {
                                                old.discrete.updates.push(response.V0.State.discrete);
                                                onUpdate(response.V0.State.discrete);
                                            }
                                            tab_update(nuri, ($cur_tab) => {
                                                $cur_tab.branch.files = old.files.length;
                                                return $cur_tab;
                                            });
                                        } else if (response.V0.Patch) {
                                            let i = old.heads.length;
                                            while (i--) {
                                                if (response.V0.Patch.commit_info.past.includes(old.heads[i])) {
                                                    old.heads.splice(i, 1);
                                                    old.head_keys.splice(i, 1);
                                                }
                                            }
                                            old.heads.push(response.V0.Patch.commit_id);
                                            old.head_keys.push(response.V0.Patch.commit_info.key);
                                            
                                            if (response.V0.Patch.discrete) {
                                                old.discrete.updates.push(response.V0.Patch.discrete);
                                                onUpdate(response.V0.Patch.discrete);
                                            }
                                            if (response.V0.Patch.graph) {
                                                //console.log(response.V0.Patch.graph)
                                                let duplicates = [];
                                                for (let i = 0; i < old.graph.length; i++) {
                                                    if (response.V0.Patch.graph.inserts.includes(old.graph[i])) {
                                                        duplicates.push(old.graph[i])
                                                    } else {
                                                        //console.log("remove?", i, old.graph[i], JSON.stringify(old.graph))
                                                        if (response.V0.Patch.graph.removes.includes(old.graph[i])) {//TODO: optimization: remove this triple from the removes list.
                                                            old.graph.splice(i, 1);
                                                            //console.log("yes",JSON.stringify(old.graph))
                                                        }
                                                    }
                                                }
                                                for (const insert of response.V0.Patch.graph.inserts){
                                                    // TODO: detect ng:a ng:j ng:n and update the tab accordingly
                                                    if (!duplicates.includes(insert)) {
                                                        old.graph.push(insert);
                                                    }
                                                }
                                                old.graph.sort();
                                            } else if (response.V0.Patch.other?.FileAdd) {
                                                old.files.unshift(response.V0.Patch.other.FileAdd);
                                                tab_update(nuri, ($cur_tab) => {
                                                    $cur_tab.branch.files = old.files.length;
                                                    return $cur_tab;
                                                });
                                            } else if (response.V0.Patch.other?.AsyncSignature) {
                                                if (old.history.commits!==false) {
                                                    // we pass the AsyncSignature to the History.svelte
                                                    response.V0.Patch.commit_info.async_sig = response.V0.Patch.other.AsyncSignature;
                                                }
                                            }
                                            if (old.history.commits!==false) {
                                                let commit = [response.V0.Patch.commit_id, response.V0.Patch.commit_info];
                                                if (old.history.commits === true) {
                                                    old.history.commits = [commit];
                                                } else {
                                                    old.history.commits.push(commit);
                                                }
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
                                persistent_error(nuri, {
                                    title: get(format)("errors.an_error_occurred"),
                                    desc: display_error(e)
                                });
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
export async function get_blob(ref: { nuri: string; reference: { key: any; id: any; }; }, only_img: boolean) {
    if (!ref) return false;
    const cached = blob_cache[ref.nuri];
    if (cached && (((await cached) !== true) || only_img )) {
        return cached;
    }
    let prom = new Promise(async (resolve) => {
        try {
            let final_blob;
            let content_type;
            let branch_nuri = "did:ng:"+get(cur_tab).doc.nuri+":"+get(cur_tab).store.overlay;
            let cancel = await ng.file_get(get(active_session).session_id, ref.reference, branch_nuri, async (blob) => {
                //console.log("GOT APP RESPONSE", blob);
                if (blob.V0.FileMeta) {
                    content_type = blob.V0.FileMeta.content_type;
                    if (only_img && !content_type.startsWith("image/")) {
                        resolve(true);
                        return true;// to cancel
                    }
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