// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.


export function is_browser() {
    return true;
}


export function client_details() {
    return navigator.userAgent;
}

export function client_details2(obj,version) {
    //console.log("version",version)
    obj.browser.appVersion = navigator?.appVersion;
    obj.browser.arch = navigator?.platform;
    obj.browser.vendor = navigator?.vendor;
    obj.browser.ua = navigator.userAgent;
    obj.engine.sdk = version;
    return JSON.stringify(obj);
}

export function session_save(key,value) {
    return new Promise((resolve, reject)=> {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = (m) => {
            if (m.data.ok) 
                resolve(undefined);
            else
                reject(m.data.error);
            port1.close();
        };
        postMessage({method:"session_save", key, value, port:port2}, {transfer:[port2]});
    });
}

export function session_get(key) {
    //console.log("session_get",key)
    return new Promise((resolve, reject)=> {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = (m) => {
            if (m.data.ok) 
                resolve(m.data.ok);
            else
                reject(m.data.error);
            port1.close();
        };
        postMessage({method:"session_get", key, port:port2}, {transfer:[port2]});
    });
}

export function local_get(key) {
    //console.log("local_get",key)
    return new Promise((resolve, reject)=> {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = (m) => {
            if (m.data.ok) 
                resolve(m.data.ok);
            else
                reject(m.data.error);
            port1.close();
        };
        postMessage({method:"local_get", key, port:port2}, {transfer:[port2]});
    });
}

export function local_save(key,value) {
    return new Promise((resolve, reject)=> {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = (m) => {
            if (m.data.ok) 
                resolve(undefined);
            else
                reject(m.data.error);
            port1.close();
        };
        postMessage({method:"local_save", key, value, port:port2}, {transfer:[port2]});
    });
}

export function storage_clear() {
    postMessage({method:"storage_clear"});
}

export function session_remove(key) {
    postMessage({method:"session_remove", key});
}

