// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

let ls;
let ss;
let no_local_storage; false;

(async () => {
    try {
        ls = localStorage;
        ss = sessionStorage;

        try {
            let ret = await document.requestStorageAccess({ localStorage: true, sessionStorage: true });
            ls = ret.localStorage;
            ss = ret.sessionStorage;
            console.log("REQUEST STORAGE ACCESS GRANTED by chrome");
        }
        catch(e) {
            console.warn("requestStorageAccess of chrome failed. falling back to previous api", e)
            try {
                await document.requestStorageAccess();
                localStorage;
                console.log("REQUEST STORAGE ACCESS GRANTED");
            } catch (e) {
                console.error("REQUEST STORAGE ACCESS DENIED",e);
                no_local_storage = true;
            }
        }

    } catch (e) {
        no_local_storage = true;
        console.log("no access to localStorage")
    }
})();

export function client_details() {
    return window.navigator.userAgent;
}

export function client_details2(obj,version) {
    //console.log("version",version)
    obj.browser.appVersion = navigator?.appVersion;
    obj.browser.arch = navigator?.platform;
    obj.browser.vendor = navigator?.vendor;
    obj.browser.ua = window.navigator.userAgent;
    obj.engine.sdk = version;
    return JSON.stringify(obj);
}

export function session_save(key,value) {
    try {
        ss.setItem(key, value);

    } catch(e) {
        console.error(e);
        return convert_error(e.message);
    }
}

export function is_browser() {
    return true;
}

function convert_error(e) {
    if (
        e == "The operation is insecure." ||
        e ==
          "Failed to read the 'sessionStorage' property from 'Window': Access is denied for this document." ||
        e ==
          "Failed to read the 'localStorage' property from 'Window': Access is denied for this document."
      ) {
        return "Please allow this website to store cookies, session and local storage.";
      } else {
        return e
      }
}

export function session_get(key) {

    try {
        return ss.getItem(key);

    } catch(e) {
        console.error(e);
    }
    
}

export function session_remove(key) {

    try {
        return ss.removeItem(key);

    } catch(e) {
        console.error(e);
    }
    
}

export function local_save(key,value) {
    try {
        ls.setItem(key, value);

    } catch(e) {
        console.error(e);
        return convert_error(e.message);
    }
}

export function storage_clear() {
    try {
        ls.clear();
        ss.clear();

    } catch(e) {
        console.error(e);
    }
}

export function local_get(key) {

    try {
        return ls.getItem(key);

    } catch(e) {
        console.error(e);
    }
    
}