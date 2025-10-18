// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

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
        sessionStorage.setItem(key, value);

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
        return sessionStorage.getItem(key);

    } catch(e) {
        console.error(e);
    }
    
}

export function session_remove(key) {

    try {
        return sessionStorage.removeItem(key);

    } catch(e) {
        console.error(e);
    }
    
}

export function local_save(key,value) {
    try {
        localStorage.setItem(key, value);

    } catch(e) {
        console.error(e);
        return convert_error(e.message);
    }
}

export function storage_clear() {
    try {
        localStorage.clear();
        sessionStorage.clear();

    } catch(e) {
        console.error(e);
    }
}

export function local_get(key) {

    try {
        return localStorage.getItem(key);

    } catch(e) {
        console.error(e);
    }
    
}