// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { writable, readable, readonly, derived, get } from "svelte/store";
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
            console.log("will try reconnect in 20 sec");
            next_reconnect = setTimeout(async ()=> {
                await reconnect();
            },20000);
        }
    }
    return false;
});

export const cannot_load_offline = writable(false);

if (!get(online) && !import.meta.env.TAURI_PLATFORM) {
    cannot_load_offline.set(true);

    let unsubscribe = online.subscribe(async (value) => {
      if (value) {
        cannot_load_offline.set(false);
        unsubscribe();
      }
    });
  }

export const has_wallets = derived(wallets,($wallets) => Object.keys($wallets).length);



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
        let info = await ng.client_info()
        //console.log("Connecting with",client,info);
        connections.set(await ng.user_connect( 
            info,
            get(active_session).user,
            location.href
        ));
        
        
    }catch (e) {
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
        load: async ()  => {
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
                let unsub = () => {};
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
                            unsub = () => {};
                            set([]);
                            unsub = await ng.app_request_stream(session.session_id, await ng.doc_fetch_repo_subscribe(nuri), 
                            async (commit) => {
                                //console.log("GOT APP RESPONSE", commit);
                                update( (old) => {old.unshift(commit); return old;} )
                            });
                        }
                        catch (e) {
                            console.error(e);
                        }
                        // this is in case decrease has been called before the load function returned.
                        if (count == 0) {unsub();}
                    },
                    increase: () => {
                        count += 1;
                        //console.log("increase sub to",count);
                        return readonly({subscribe});
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
                        console.log("unsubscribed ",nuri);
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