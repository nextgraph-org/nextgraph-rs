// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { writable, readonly, derived, get } from "svelte/store";
import ng from "./api";

let all_branches = {};

export const opened_wallets = writable({});

/// { wallet:, id: }
export const active_wallet = writable(undefined);

export const wallets = writable({});

export const connections = writable({});

export const active_session = writable(undefined);

let next_reconnect = null;

export const online = derived(connections,($connections) => { 
    for (const cnx of Object.keys($connections)) {
        if (!$connections[cnx].error) return true;
        else if ($connections[cnx].error=="PeerAlreadyConnected") { 
            connections.update((c) => {
                c[cnx].error = undefined;
                return c;
            });
            return true; }
        else if ($connections[cnx].error=="ConnectionError" && !$connections[cnx].connecting && next_reconnect==null) {
            console.log("will try reconnect in 1 min");
            next_reconnect = setTimeout(async ()=> {
                await reconnect();
            },60000);
        }
    }
    return false;
});

export const has_wallets = derived(wallets,($wallets) => Object.keys($wallets).length);



export const set_active_session = function(session) {
    active_session.set(session.users);
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
}

export const close_active_session = async function() {

    active_session.set(undefined);
    await ng.broker_disconnect();

}

const can_connect = derived([active_wallet, active_session], ([$s1, $s2]) => [
    $s1,
    $s2,
  ]
);

export const reconnect = async function() {
    if (next_reconnect) { 
        clearTimeout(next_reconnect);
        next_reconnect = null;
    }
    if (!get(active_session)) {
        return;
    }
    console.log("attempting to connect...");
    try {
        let client = get(wallets)[get(active_wallet).id].client;
        let info = await ng.client_info()
        //console.log("Connecting with",client,info);
        connections.set(await ng.broker_connect( 
            client,
            info,
            get(active_session),
            get(active_wallet).wallet,
            location.href
        ));
    }catch (e) {
        console.error(e)
    }
}
export const disconnections_subscribe = async function() {
    let disconnections_unsub = await ng.disconnections_subscribe(async (user_id) => {
        console.log("DISCONNECTION FOR USER", user_id);
        connections.update((c) => {
            c[user_id].error = "ConnectionError";
            c[user_id].since = new Date();
            return c;
        });
    });
}

can_connect.subscribe(async (value) => {
    if (value[0] && value[0].wallet && value[1]) {

      await reconnect();
    }
  });

const branch_commits = (nura, sub) => {
    // console.log("branch_commits")
    // const { subscribe, set, update } = writable([]); // create the underlying writable store

    // let unsub = () => {};
    // return {
    //     load: async ()  => {
    //         console.log("load")
    //         unsub = await ng.doc_sync_branch(nura, async (commit) => {
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
        load: async ()  => {
            let already_subscribed = all_branches[nura];
            if (!already_subscribed) return;
            if (already_subscribed.load) {
                await already_subscribed.load();
                already_subscribed.load = undefined;
            }
        },
        subscribe: (run, invalid) => {
            
            let already_subscribed = all_branches[nura];
            if (!already_subscribed) {
                const { subscribe, set, update } = writable([]); // create the underlying writable store
                let count = 0;
                let unsub = () => {};
                already_subscribed = {
                    load: async () => {
                        unsub = await ng.doc_sync_branch(nura, async (commit) => {
                            console.log("GOT COMMIT", commit);
                            update( (old) => {old.unshift(commit); return old;} )
                        });
                        // this is in case decrease has been called before the load function returned.
                        if (count == 0) {unsub();}
                    },
                    increase: () => {
                        count += 1;
                        return readonly({subscribe});
                    },
                    decrease: () => {
                        count -= 1;
                        if (count == 0) {
                            unsub();
                            delete all_branches[nura];
                        }
                    },
                }
                all_branches[nura] = already_subscribed;
            }
            
            let new_store = already_subscribed.increase();
            let read_unsub = new_store.subscribe(run, invalid);
            return () => {
                read_unsub();
                already_subscribed.decrease();
            }
            
        }
    }
};

export default branch_commits;