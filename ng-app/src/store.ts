import { writable, readonly, derived } from "svelte/store";
import ng from "./api";

let all_branches = {};

export const opened_wallets = writable({});

/// { wallet:, id: }
export const active_wallet = writable(undefined);

export const wallets = writable({});

export const has_wallets = derived(wallets,($wallets) => Object.keys($wallets).length);

export const active_session = writable(undefined);

export const set_active_session = function(session) {
    active_session.set(session.users);
};

export { writable, readonly, derived };

const close_active_wallet = function() {

    active_session.set(undefined);
    active_wallet.update((w) => {
        delete w.wallet;
    });
    
}

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