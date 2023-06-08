import { writable } from "svelte/store";
import ng from "./api";

const branch_commits = (nura, sub) => {

    const { subscribe, set, update } = writable([]); // create the underlying writable store

    let unsub = () => {};
    return {
        load: async ()  => {
            unsub = await ng.doc_sync_branch(nura, async (commit) => {
                console.log(commit);
                update( (old) => {old.unshift(commit); return old;} )
            });
        },
        subscribe: (run, invalid) => {
        
            let upper_unsub = subscribe(run, invalid);

            return () => {
                upper_unsub();
                unsub();
            }
        }
    // set: (value) => {
    //   localStorage.setItem(key, toString(value)); // save also to local storage as a string
    //   return set(value);
    // },
    // update,
    };
};

export default branch_commits;