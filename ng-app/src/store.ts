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
import { register, init, locale } from "svelte-i18n";
import ng from "./api";
import { official_classes } from "./classes";
import { official_apps, official_services } from "./zeras";

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

let loaded_external_apps = {};

export const load_app = async (appName: string) => {

    if (appName.startsWith("n:g:z")) {
        let app = official_apps[appName];
        if (!app) throw new Error("Unknown official app");
        return await import(`./apps/${app["ng:b"]}.svelte`);
    } else {
        //TODO: load external app from its repo
        // TODO: return IFrame component
    }

};

export const invoke_service = async (serviceName: string, nuri: string, args: object) => {

    if (serviceName.startsWith("n:g:z")) {
        let service = official_services[serviceName];
        if (!service) throw new Error("Unknown official service");
        // TODO: do this in WebWorker
        // TODO: if on native app or CLI: use deno
        //return await ng.app_invoke(serviceName[6..], nuri, args);
    } else {
        // TODO: if on webapp: only allow those invocations from IFrame of external app or from n:g:z:external_service_invoke (which runs in an IFrame) and run it from webworker
        // TODO: if on native app or CLI: use deno
        // TODO: load external service from its repo
    }

};


export const cur_tab = writable({
    cur_store: {
        has_outer: {
            nuri_trail: ":v:l"
        },
        type: "public", // "protected", "private", "group", "dialog",
        favicon: "",
        title: "Group B",
    },
    cur_branch: {
        b: "b:xxx", //branch id (can be null if not of type "branch")
        c: "c:xxx", //commit(s) id
        type: "main", // "stream", "detached", "branch", "in_memory" (does not save)
        display: "c:X", // or main or stream or a:xx or branch:X (only 7 chars)
        attachments: 1,
        class: "data/graph",
        title: false,
        icon: false,
        description: "",
        app: "n:g:z:json_ld_editor", // current app being used
    },
    view_or_edit: false,
    graph_viewer: "n:g:z:json_ld_editor", // selected viewer
    graph_editor: "n:g:z:json_ld_editor", // selected editor
    discrete_viewer: "n:g:z:json_ld_editor", // selected viewer
    discrete_editor: "n:g:z:json_ld_editor", // selected editor
    graph_viewers: ["n:g:z:json_ld_editor"], // list of available viewers
    graph_editors: ["n:g:z:json_ld_editor"], // list of available editors
    discrete_viewers: [], // list of available viewers
    discrete_editors: [], // list of available editors
    find: false,//or string to find
    graph_or_discrete: true,
    read_cap: 'r:',
    doc: {
        is_store: false,
        is_member: false,
        can_edit: false,
        live_edit: true,
        title: "Doc A",
        authors: "",
        icon: "",
        description: "",
        stream: {
            notif: 1,
            last: "",
        },
        live_editors: {

        },
    },
    folders_pane: false,
    toc_pane: false,
    right_pane: false, // "folders", "toc", "branches", "files", "history", "comments", "info", "chat"
    action: false, // "view_as", "edit_with", "share", "react", "repost", "copy", "dm_author", "new_block", "notifs", "schema", "signature", "permissions", "query",

});

export const opened_wallets = writable({});

/// { wallet:, id: }
export const active_wallet = writable(undefined);

export const wallets = writable({});

export const connections: Writable<Record<string, any>> = writable({});

export const active_session = writable(undefined);

export const connection_status: Writable<"disconnected" | "connected" | "connecting"> = writable("disconnected");

let next_reconnect: NodeJS.Timeout | null = null;

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

//export default branch_commits;